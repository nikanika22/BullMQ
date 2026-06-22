import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Job } from 'bullmq';
import type { JobData } from 'apps/bull-mq/src/shared/Job-data';
@Injectable()
@Processor('webhook_queue',{concurrency: Number(process.env.CONCURRENCY)})
export class WorkerService extends WorkerHost {
  private readonly logger = new Logger(WorkerService.name);
 
  /**
   * Phương thức cốt lõi — BullMQ tự động gọi hàm này khi có job mới trong queue.
   * Nếu hàm này throw Error → BullMQ đánh dấu job thất bại và kích hoạt retry (backoff).
   * Nếu hàm này return bình thường → job hoàn thành thành công.
   */
  async process(job: Job<JobData>): Promise<unknown> {

    const { url, params } = job.data; 
    // axios.post tự throw AxiosError khi gặp lỗi HTTP 4xx/5xx → BullMQ bắt và retry
    const { data } = await axios.post<unknown>(url, params);
    return data;
  }
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`[Job ${job.id}] Hoàn thành!`);
  }
}
