import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { Group } from '../shared/database/group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group])
],
  controllers: [],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
