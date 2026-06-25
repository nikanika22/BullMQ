import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Job, DelayedError,UnrecoverableError  } from 'bullmq';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import type { JobData } from 'apps/bull-mq/src/shared/Job-data';
import { ICallState } from 'apps/bull-mq/src/shared/CallState-data';

@Injectable()
@Processor('webhook_queue', { concurrency: Number(process.env.CONCURRENCY) })
export class WorkerService extends WorkerHost {
  private readonly logger = new Logger(WorkerService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {
    super();
  }

  async process(job: Job<JobData>, token?: string): Promise<unknown> {
    const callId = job.data.params?.meta?.callId;
    const { url, params } = job.data;
    //ở đây check xem url đó đã bị khóa do số lần đẩy vượt mức chưa.
    const isCircuitBreakerOpen = await this.redis.get(`webhook_circuit_breaker:${url}`);
    if (isCircuitBreakerOpen === 'OPEN') {
      this.logger.warn(`[Job ${job.id}] URL ${url} đang bị ngắt (Circuit Breaker OPEN). Tạm dừng gửi.`);
      throw new UnrecoverableError(`Circuit Breaker OPEN cho URL: ${url}`);
    }
      const stateRaw = await this.redis.get(`call_state:${callId}`);
      if (stateRaw) {
        const state = JSON.parse(stateRaw) as ICallState;
        //A NẾU DÂY CHUYỀN ĐÃ CHẾT HẲN -> HỦY LUÔN JOB
        if (state.state === 'dead') {
          this.logger.warn(`[Job ${job.id}] Bị hủy dây chuyền do nhóm ${callId} đã thất bại hoàn toàn trước đó.`);
          // Ném ra UnrecoverableError sẽ không retry lại đưa thằng vào failed luôn
          throw new UnrecoverableError(`Cascade Fail: Nhóm cuộc gọi ${callId} đã chết.`);
        }

        // B. NẾU DÂY CHUYỀN ĐANG RETRY -> ĐƯA JOB ĐI NGỦ ĐÔNG
        if (state.state === 'retrying') {
          // Tính toán thời gian ngủ lũy thừa (mặc định delay 5s nếu không có cấu hình)
          // ở đây không phải là job đang xử lý retry nếu không sẽ bị vòng lặp vô tận
          if(job.id !== state.failedJobId){
            
          const delay = state.backoffDelay;
          let totalDelay = 0;
          for (let i = state.attemptsMade; i < state.maxAttempts; i++) {
            totalDelay += Math.pow(2, i-1) * delay;
          }
          const sleepTime = totalDelay + Number(process.env.BUFFER); //bù đắp độ trễ
          if (job.id) {
            await this.redis.sadd(`call_sleeping:${callId}`, job.id);
            await this.redis.expire(`call_sleeping:${callId}`, Number(process.env.TTL));
          }

          this.logger.log(`[Job ${job.id}] Đang đi ngủ trong ${sleepTime / 1000}s vì cuộc gọi ${callId} đang retry.`);
          
          await job.moveToDelayed(Date.now() + sleepTime, token);
          throw new DelayedError();
        }
      }
    }

    // C. CHẠY LOGIC THỰC TẾ (NẾU KHÔNG CÓ CỜ ĐỘC / CỜ NGỦ)
    const { data } = await axios.post<unknown>(url, params);
    return data;
  }
  @OnWorkerEvent('completed')
  async onCompleted(job: Job<JobData>) {
    const callId = job.data.params?.meta?.callId;
    const url = job.data.url;
    this.logger.log(`[Job ${job.id}] Hoàn thành!`);
    // Xóa key đếm lỗi (nếu job thành công thì reset trạng thái)
    if (url) {
      await this.redis.del(`webhook_failures:${url}`);
    }
    if (callId) {
      await this.wakeUpSleepingJobs(callId);
      await this.redis.del(`call_state:${callId}`);
    }
  }

  /**
   * Lắng nghe sự kiện thất bại tại Worker
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<JobData>, error: Error) {
    // ở nếu là DelayedError thì bỏ do mình tự ném ra ở trên.
    if (error instanceof DelayedError) 
      {
        console.log("DelayedError");
        return;
      }
      // Ở đây nếu UnrecpberableError cũng là do mình ném ra để cho đẩy ra failed hàng loạt
    if(error instanceof UnrecoverableError) 
      {
        console.log("UnrecoverableError");
        return;
      }
    const {url}=job.data;
    // tăng biến đếm lỗi 
    if (url) {
      const maxRetriesRaw:string|null=await this.redis.get(`webhook_max_retries:${url}`);
      if(maxRetriesRaw!==null)
        {
        const maxRetries=Number(maxRetriesRaw);
        // ở đây sẽ khởi tạo số lần fail, nếu chưa tồn tại thì incr sẽ là 0, còn tồn tại thì +1
        const failures = await this.redis.incr(`webhook_failures:${url}`);
        if(failures>=maxRetries)
        {
          // ở đây set nếu check đạt tới giới hạn này thì sẽ không axios nữa.
            const cooldown= Number(process.env.WEBHOOK_COOLDOWN_PERIOD)|| 300;
             await this.redis.set(`webhook_circuit_breaker:${url}`, 'OPEN', 'EX', cooldown);
          this.logger.error(`[Circuit Breaker] URL ${url} thất bại ${failures}/${maxRetries} lần. NGẮT trong ${cooldown}s.`);
        }
        else{
          this.logger.log(`[Job ${job.id}] Đã thất bại ${failures}/${maxRetries} lần. Vẫn đang xử lý.`);
        }
      }
    }
    const callId = job.data.params?.meta?.callId;
    if (!callId) return;

    const maxAttempts = job.opts.attempts || 1;
    const isCompletelyDead = job.attemptsMade >= maxAttempts;
    if (isCompletelyDead ) {
      const deadState: ICallState = {
        state: 'dead',
        attemptsMade: job.attemptsMade,
        maxAttempts,
        backoffDelay: 0,
        failedJobId: job.id ?? '',
      };
      await this.redis.set(`call_state:${callId}`, JSON.stringify(deadState), 'EX', Number(process.env.TTL));
      this.logger.error(`[Job ${job.id}] Đã chết vĩnh viễn cho nhóm ${callId}.`);
      await this.wakeUpSleepingJobs(callId);
    } else {
      // 2. Cập nhật cờ đang retry cùng meta-data mới nhất
      let backoffDelay=0;
      if (job.opts.backoff) {
        if (typeof job.opts.backoff === 'number') {
          backoffDelay = job.opts.backoff;
        } else if (
          typeof job.opts.backoff === 'object' &&
          'delay' in job.opts.backoff
        ) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          backoffDelay = (job.opts.backoff as any).delay;
        }
      }

      const retryingState: ICallState = {
        state: 'retrying',
        attemptsMade: job.attemptsMade,
        maxAttempts,
        backoffDelay,
        failedJobId: job.id ?? '',
      };
      await this.redis.set(`call_state:${callId}`, JSON.stringify(retryingState), 'EX', Number(process.env.TTL));
      this.logger.warn(`[Job ${job.id}] Lỗi lần ${job.attemptsMade}/${maxAttempts}. Đặt trạng thái retrying cho nhóm.`);
    }
  }

  // Hàm helper dùng để đánh thức các job đang ngủ trong nhóm
  private async wakeUpSleepingJobs(callId: string) {
    const sleepingKey = `call_sleeping:${callId}`;
    const sleepingIds = await this.redis.smembers(sleepingKey);
    if (!sleepingIds.length) return;

    this.logger.log(`Phát hiện ${sleepingIds.length} job đang ngủ trong nhóm ${callId}. Đang đánh thức...`);
    for (const id of sleepingIds) {
      try {
        const targetJob = await Job.fromId(this.worker, id);
        if (targetJob) {
          await targetJob.promote();
          this.logger.log(`-> Đã đánh thức thành công Job: ${id}`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Không thể đánh thức Job ${id}: ${errMsg}`);
      }
    }
    await this.redis.del(sleepingKey);
  }
}