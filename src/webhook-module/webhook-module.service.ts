import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue} from 'bullmq';
import { createHash } from 'crypto';
@Injectable()
export class WebhookModuleService {
  private readonly logger = new Logger(WebhookModuleService.name);

  constructor(
    @InjectQueue('webhook_queue') private readonly webhookQueue: Queue,
  ) {}

  async dispatchEvent(url: string, params: Record<string, unknown>) {
    const eventId=params.eventId as string || ' ';
    const eventType=params.eventType as string || ' ';
    const jobId=createHash('sha256').update(eventId+eventType).digest('hex');
    console.log('eventId: ', eventId);
    console.log('eventType: ', eventType);
    console.log('EventID+EventType: ',eventId+eventType);
    console.log('jobId: ', jobId);
    const job = await this.webhookQueue.add(
      'sendWebhook',
      { url, params },
      {
        jobId: jobId,
        attempts: Number(process.env.WEBHOOK_MAX_RETRY),
        backoff: {
          type: 'exponential', 
          delay: 2000,
        },
        removeOnComplete: false,
      },
    );
  
    this.logger.log(`Job [${job.id}] đã được đẩy vào queue | url: ${url}`);
    return { success: true };
  }
}
