import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue} from 'bullmq';
import { createHash } from 'crypto';
import { GroupsService } from '../groups/groups.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { WebhookPayload } from '../shared/WebhookPayload-data';
@Injectable()
export class WebhookModuleService {
  private readonly logger = new Logger(WebhookModuleService.name);

  constructor(
    @InjectQueue('webhook_queue') private readonly webhookQueue: Queue,
    private readonly groupsService: GroupsService,
    @InjectRedis() private readonly redis: Redis,
  
  ) {}

  async dispatchEvent(url: string, params: WebhookPayload) {
    const eventId=params.eventId;
    const eventType=params.eventType;
    const callee=params.callee;
    const uniqueid =params.meta?.call?.uniqueid;
    // đoạn này ở đây sẽ check xem đã tồn tại url đó chưa, nếu có thì không đọc db lại làm gì
    const cacheKey=`webhook_max_retries:${url}`;
    const cachedData=await this.redis.get(cacheKey);
     if(!cachedData){  
      await this.groupsService.findOneByUrl(url);
     }
    const jobId=createHash('sha256').update(eventId+eventType+callee+uniqueid+callee).digest('hex');
    const job = await this.webhookQueue.add(
      'sendWebhook',
      { url, params },
      {
        jobId: jobId,
        attempts: Number(process.env.WEBHOOK_MAX_RETRY),
        backoff: {
          type: process.env.BACKUP_TYPE as string, 
          delay: Number(process.env.TIME_DALAY),
        },
        removeOnComplete: {
          //xoa job khi job hoan thanh sau 24h
          age: Number(process.env.TTL),
        },
        removeOnFail:{
          //xoa job khi job that bai sau 24h
          age: Number(process.env.TTL),
        }
      },
    );
  this.logger.log(`Job [${job.id}] đã được đẩy vào queue | url: ${url}`);
  return { success: true };
}
async retryAll()
{
    const circuitBreakerKeys = await this.redis.keys('webhook_circuit_breaker:*');
    const callStateKeys = await this.redis.keys('call_state:*');
    const callSleepingKeys = await this.redis.keys('call_sleeping:*');
    const failureKeys = await this.redis.keys('webhook_failures:*');
    console.log('Circuit Breaker Keys:', circuitBreakerKeys);
    console.log('Call State Keys:', callStateKeys);
    console.log('Call Sleeping Keys:', callSleepingKeys);
    console.log('Failure Keys:', failureKeys);
    const allKeys = [
      ...circuitBreakerKeys,
      ...callStateKeys,
      ...callSleepingKeys,
      ...failureKeys,
    ];
    console.log(allKeys)
    // 2. Xóa toàn bộ trạng thái cản (Reset hệ thống bộ đếm, ngắt mạch, ngủ đông)
    if (allKeys.length > 0) {
      // Dùng pipeline để xóa nhanh mà không gặp lỗi số lượng arguments quá lớn
      const pipeline = this.redis.pipeline();
      allKeys.forEach((key) => pipeline.del(key));
      await pipeline.exec();
      this.logger.log(`Đã dọn dẹp ${allKeys.length} key cơ chế cản trong Redis.`);
    }
    // 3. Kéo toàn bộ job đang kẹt (thất bại hoặc đang ngủ đông/chờ)
    // hàm getFailed này alway return theo finishedon giảm dần nghe.....
    const failedJobs = await this.webhookQueue.getFailed();
    //sort lại để đúng trình tự timespan lúc add queue
     failedJobs.sort((a,b)=>a.timestamp-b.timestamp);
    let retriedCount = 0;
    // 4. Đẩy lại các job thất bại về trạng thái chờ chạy (waiting)
    for (const job of failedJobs) {
      if (job) {
        // Gọi .retry() BullMQ sẽ tự động xử lý reset attempts và ném job vào đầu hàng đợi
        await job.retry('failed');
        retriedCount++;
      }
    }
    this.logger.log(`Đã lôi lên và đẩy lại tổng cộng ${retriedCount} jobs.`);
    
    return {
      success: true,
      retriedCount,
      clearedKeys: allKeys.length,
      message: 'Đã xóa bỏ hoàn toàn mọi cơ chế cản và đẩy lại toàn bộ các job kẹt.',
    };
}
}

