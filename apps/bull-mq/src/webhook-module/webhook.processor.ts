import {OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationService } from '../notification/notification.service';
import type { JobData } from '../shared/Job-data';

export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);
  constructor(private readonly notificationService: NotificationService) {
  }
  
  /**
   * Phương thức cốt lõi — BullMQ tự động gọi hàm này khi có job mới trong queue.
   * Nếu hàm này throw Error → BullMQ đánh dấu job thất bại và kích hoạt retry (backoff).
   * Nếu hàm này return bình thường → job hoàn thành thành công.
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);

    if (isLastAttempt) {
      this.logger.error(
        `[Job ${job.id}] ĐÃ THẤT BẠI HOÀN TOÀN sau ${job.attemptsMade} lần thử | Lỗi: ${error.message}`,
      );

      // Extract job data với type rõ ràng — tránh unsafe assignment
      const { url, params } = job.data as JobData;

      // Gọi NotificationService — tự load channel từ DB, gửi đến từng provider
      await this.notificationService.sendAlert({
        jobId:            job.id ?? '',
        url:              url,
        calldate:         params.meta.call.starttime,
        caller:           params.caller,
        callee:           params.callee,
        callId:           params.meta.callId,
        connector_server: params.meta.call.connector_server,
      });
    } else {
      this.logger.warn(
        `[Job ${job.id}] Thất bại lần ${job.attemptsMade} — sẽ thử lại sau... | Lỗi: ${error.message}`,
      );
    }
  }
}
