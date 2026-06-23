import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { WebhookModuleModule } from './webhook-module/webhook-module.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from './notification/notification.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationChannel } from './notification/entities/notification-channel.entity';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    // app.module.ts — thêm vào imports
     
        ConfigModule.forRoot({
          isGlobal: true,
        }),
    TypeOrmModule.forRoot({
      type: 'mysql', // TypeORM dùng 'mysql' cho cả MySQL lẫn MariaDB
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      entities: [NotificationChannel],

      synchronize: false, // không để TypeORM tự sửa schema
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

    BullModule.forRoot({
      connection: {
        host: process.env.DB_HOST_REDIS,
        port: Number(process.env.DB_PORT_REDIS),
      },
    }),
    WebhookModuleModule,
    NotificationModule,
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    // Đăng ký queue vào Board
    BullBoardModule.forFeature(
      {
        name: 'webhook_queue',
        adapter: BullMQAdapter, // Import từ @bull-board/api/bullMQAdapter
      },
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
