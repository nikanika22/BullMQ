import { QueueEventsHost, QueueEventsListener, OnQueueEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

@QueueEventsListener('webhook_queue')
export class WebhookQueueEvents extends QueueEventsHost {
  private readonly logger = new Logger(WebhookQueueEvents.name);

  // Lắng nghe sự kiện duplicated của queue
  @OnQueueEvent('duplicated')
  onDuplicated({ jobId }: { jobId: string }) {
    this.logger.warn(`[TRÙNG LẶP] Job bị bỏ qua vì đã tồn tại | jobId: ${jobId}`);
  }
}
