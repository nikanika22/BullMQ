import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookModuleService } from './webhook-module.service';
import { WebhookModuleController } from './webhook-module.controller';
import { WebhookProcessor } from './webhook.processor';

@Module({
  imports: [
    // Queue sẽ kết nối Redis qua forRoot() đã cấu hình ở app.module.ts.
    BullModule.registerQueue({
      name: 'webhook_queue',
      // prefix: 'my_app',  ở đây có thể điền my_app đại diện cho folder lưu trong database.
    }),
  ],
  controllers: [WebhookModuleController],
  //Thêm WebhookProcessor vào providers để NestJS khởi tạo Worker chạy nền.
  providers: [WebhookModuleService, WebhookProcessor],
})
export class WebhookModuleModule {}
