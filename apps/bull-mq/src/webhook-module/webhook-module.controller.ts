import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhookModuleService } from './webhook-module.service';
import { WebhookPayload } from '../shared/WebhookPayload-data';

// DTO — mô tả payload nhận từ client khi gọi API dispatch
class DispatchEventDto {
  url: string;                          // URL server khách hàng cần gọi
  params: WebhookPayload;      // Body data sẽ gửi kèm
}

@Controller('webhook')
export class WebhookModuleController {
  private readonly logger = new Logger(WebhookModuleController.name);

  constructor(private readonly webhookModuleService: WebhookModuleService) {}

  @HttpCode(HttpStatus.OK)
  @Post('dispatch')
  async dispatch(@Body() dto: DispatchEventDto) {
    this.logger.log(JSON.stringify(dto, null, 2));
    this.logger.log(`Nhận event → dispatch tới queue | url: ${dto.url}`);
    return this.webhookModuleService.dispatchEvent(dto.url, dto.params);
  }
  @HttpCode(HttpStatus.OK)
  @Post('retryAll')
  async retryAll ()
  {
      return await this.webhookModuleService.retryAll();
  }
}
