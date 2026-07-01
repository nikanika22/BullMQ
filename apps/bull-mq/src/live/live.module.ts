import { Module } from '@nestjs/common';
import { LiveService } from './live.service';
import { LiveGateway } from './live.gateway';
import { LiveController } from './live.controller';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports:[BullModule.registerQueue({
    name: 'webhook_queue'
  })],
  providers: [LiveGateway, LiveService],
  controllers:[LiveController],
  exports:[LiveService,LiveGateway]

})
export class LiveModule {}
