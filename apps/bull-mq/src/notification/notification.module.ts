import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationChannel } from './entities/notification-channel.entity';

@Module({
  imports:[
    TypeOrmModule.forFeature([NotificationChannel])
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports:[NotificationService]
})
export class NotificationModule {}
