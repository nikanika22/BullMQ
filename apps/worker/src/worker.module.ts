import "dotenv/config";
import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from "@nestjs-modules/ioredis";
import { LiveModule } from "apps/bull-mq/src/live/live.module";
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  RedisModule.forRootAsync({
    useFactory: () => ({
      type: 'single',
      options: {
        host: process.env.DB_HOST_REDIS,
        port: Number(process.env.DB_PORT_REDIS),
      },
    }),
  }),
  LiveModule
] 
,
  controllers: [],
  providers: [WorkerService],
})
export class WorkerModule {}
