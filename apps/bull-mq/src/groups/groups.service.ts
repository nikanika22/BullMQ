import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Group } from '../shared/database/group.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRedis() 
    private readonly redis: Redis,
  ) {}
  async findOneByUrl(url: string):Promise<void> {
    //check xem đã tồn tại trong redis url đã check chưa thì khỏi truy xuất db
    const group : Group | null = await this.groupRepository
      .createQueryBuilder('g')
      .where(`JSON_SEARCH(g.url, 'one', :url) IS NOT NULL`, { url })
      .getOne();
    if (!group) {
      this.logger.debug(`[Cache] Group with url ${url} not found.`);
      throw new NotFoundException(`Group with url ${url} not found`);
    }

    //gắn url lại cho chuẩn url đã tra bởi vì trong đó có thể có nhiều url
    group.url = url;
    // luu lại kết quả với cache hợp lệ await this.redis.set(cacheKey, JSON.stringify(group),'EX', Number(process.env.TTL));
    if(group.maxRetries)
    {
      await this.redis.set(`webhook_max_retries:${url}`, group.maxRetries,'EX', Number(process.env.TTL|| 0))
    }
  }
}

