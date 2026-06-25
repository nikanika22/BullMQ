import { Injectable, NotFoundException } from '@nestjs/common';
import { Group } from '../shared/database/group.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}
  async findOneByUrl(url: string): Promise<Group> {
    const group = await this.groupRepository
      .createQueryBuilder('g')
      .where(`JSON_SEARCH(g.url, 'one', :url) IS NOT NULL`, { url })
      .getOne();
    if (!group) {
      console.log(`Group with url ${url} not found`);
      throw new NotFoundException(`Group with url ${url} not found`);
    }
    group.url = url;
    return group;
  }
}
