import { InjectQueue, OnQueueEvent, QueueEventsHost, QueueEventsListener } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NotificationService } from '../notification/notification.service';
import type { JobData } from '../shared/Job-data';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
@QueueEventsListener('webhook_queue')
@Injectable()
export class WebhookProcessor extends QueueEventsHost {
  private readonly logger = new Logger(WebhookProcessor.name);
  constructor(
    private readonly notificationService: NotificationService,
    @InjectRedis() private readonly redis: Redis,
    @InjectQueue('webhook_queue') private readonly queue: Queue,
  ) {
    super();
  }
  
  /**
   * Lắng nghe sự kiện thất bại từ QueueEvents (Global Event).
   * Phải dùng @OnQueueEvent và nhận args chứa jobId.
   */
  @OnQueueEvent('failed')
  async onFailed(args: { jobId: string; failedReason: string; prev?: string }) {
    const job = await this.queue.getJob(args.jobId);
    if (!job) return;
   // Extract job data với type rõ ràng — tránh unsafe assignment
      const { url, params } = job.data as JobData;

      //Gọi NotificationService — tự load channel từ DB, gửi đến từng provider
      await this.notificationService.sendAlert({
        jobId:            job.id ?? '',
        url:              url,
        calldate:         params.meta.call.starttime,
        caller:           params.caller,
        callee:           params.callee,
        callId:           params.meta.callId,
        connector_server: params.meta.call.connector_server,
      });
    }
  }



