import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import axios from 'axios';

@Processor('webhook_queue')
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  /**
   * Phương thức cốt lõi — BullMQ tự động gọi hàm này khi có job mới trong queue.
   * Nếu hàm này throw Error → BullMQ đánh dấu job thất bại và kích hoạt retry (backoff).
   * Nếu hàm này return bình thường → job hoàn thành thành công.
   */
  async process(job: Job<{ url: string; params: Record<string, unknown> }>): Promise<unknown> {
    const { url, params } = job.data; // Lấy dữ liệu do Service đẩy vào

    this.logger.log(
      `[Job ${job.id}] Attempt ${job.attemptsMade + 1} / ${job.opts.attempts} | POST → ${url}`,
    );

    // axios.post tự throw AxiosError khi gặp lỗi HTTP 4xx/5xx → BullMQ bắt và retry
    const data = await axios.post<unknown>(url, params);

    this.logger.log(`✅ [Job ${job.id}] Gửi thành công → ${JSON.stringify(data)}`);
    return data;
  }
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`[Job ${job.id}] Hoàn thành!`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);

    if (isLastAttempt) {
      this.logger.error(
        `[Job ${job.id}] ĐÃ THẤT BẠI HOÀN TOÀN sau ${job.attemptsMade} lần thử | Lỗi: ${error.message}`,
      );
    } else {
      this.logger.warn(
        `[Job ${job.id}] Thất bại lần ${job.attemptsMade} — sẽ thử lại sau... | Lỗi: ${error.message}`,
      );
    }
  }
}
