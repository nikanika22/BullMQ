import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue} from 'bullmq';
import { createHash } from 'crypto';
import { Group } from '../shared/database/group.entity';
import { GroupsService } from '../groups/groups.service';
@Injectable()
export class WebhookModuleService {
  private readonly logger = new Logger(WebhookModuleService.name);

  constructor(
    @InjectQueue('webhook_queue') private readonly webhookQueue: Queue,
    private readonly groupsService: GroupsService,
  ) {}

  async dispatchEvent(url: string, params: Record<string, unknown>) {
    const eventId=params.eventId as string || ' ';
    const eventType=params.eventType as string || ' ';
    const callee=params.callee as string || ' ';
    const uniqueid = (params as { meta?: { call?: { uniqueid?: string } } })?.meta?.call?.uniqueid || ' ';
    const group: Group=await this.groupsService.findOneByUrl(url);
    console.log("group: ",group);
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
}

