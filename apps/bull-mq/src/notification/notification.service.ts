import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import {
  NotificationChannel,
  ProviderType,
} from './entities/notification-channel.entity';
import IWebhookData from '../shared/WebhookAlertData';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(NotificationChannel)
    private readonly channelRepo: Repository<NotificationChannel>,
  ) {}

  async sendAlert(data: IWebhookData): Promise<void> {
    // 1. Lấy tất cả channel đang bật từ DB
    const channels = await this.channelRepo.find({
      where: { isActive: true },
    });

    if (channels.length === 0) {
      this.logger.warn('Không có notification channel nào đang active');
      return;
    }

    // 2. Gửi đến từng channel theo provider
    for (const channel of channels) {
      await this.sendToChannel(channel, data);
    }
  }

  private async sendToChannel(
    channel: NotificationChannel,
    data: IWebhookData,
  ): Promise<void> {
    try {
      if (channel.provider === ProviderType.DISCORD) {
        await this.sendDiscord(channel.config['webhook_url'], data);
      }
      this.logger.log(`Alert gửi OK → ${channel.provider} (${channel.name})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Alert thất bại → ${channel.provider} | ${msg}`);
      // Không throw — channel này lỗi không ảnh hưởng channel kia
    }
  }

  private async sendDiscord(
    webhookUrl: string,
    data: IWebhookData,
  ): Promise<void> {
    await axios.post(webhookUrl, {
      embeds: [
        {
          title: '📞 Cảnh báo cuộc gọi thất bại',
          color: 0xe74c3c,
          fields: [
            { name: 'Caller', value: String(data.caller), inline: true },
            { name: 'Callee', value: String(data.callee), inline: true },
            { name: 'Call_ID', value: String(data.callId), inline: true },
            {
              name: '🚨 STATUS',
              value: '```ansi\n\u001b[1;37;41m                       FAILED                       \u001b[0m\n```',
              inline: false,
            },
            {
              name: 'Connector_Server',
              value: String(data.connector_server),
              inline: false,
            },
            { name: 'Job_ID', value: String(data.jobId), inline: false },
            { name: 'URL', value: String(data.url), inline: false },
          ],
          footer: { text: String(data.calldate) },
        }
      ],
      timeout: Number(process.env.WEBHOOK_TIMEOUT),
    });
  }
}
