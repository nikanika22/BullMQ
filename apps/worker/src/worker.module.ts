import "dotenv/config";
import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { BullModule } from '@nestjs/bullmq';
@Module({
  imports: [BullModule.forRoot({
    connection: {
      host: process.env.DB_HOST_REDIS,
      port: Number(process.env.DB_PORT_REDIS),
    },
  }),
  BullModule.registerQueue({
    name: 'webhook_queue',
  }),
],
  controllers: [],
  providers: [WorkerService],
})
export class WorkerModule {}
