import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { WebhookModuleModule } from './webhook-module/webhook-module.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal:true,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
      }
    }),
    WebhookModuleModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
