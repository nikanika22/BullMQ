import { PartialType } from '@nestjs/mapped-types';
import { CreateWebhookModuleDto } from './create-webhook-module.dto';

export class UpdateWebhookModuleDto extends PartialType(CreateWebhookModuleDto) {}
