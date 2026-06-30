import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import Redis from 'ioredis';

export interface IDataState{
    callKey: string;
    eventType: string;
    caller: string;
    callee: string;
    did?: string;
    startedAt?: string;
    updatedAt?: string;
}
@Injectable()
export class LiveService {
    private readonly logger=new Logger(LiveService.name);
    constructor(
        @InjectRedis()
        private readonly redis:Redis
    ){}
   private buildCallKey(params: IDataState): string | null {
    const callId    = params.callKey;
    const extension = params.callee;
    const raw = `${callId}:${extension}`;
    return createHash('sha256').update(raw).digest('hex'); // → "a3f1bc9d..." (32 ký tự)
  }

  async updateCallState(params: IDataState) {
    try {
      const callKey = this.buildCallKey(params);
      if (!callKey) return;
      const redisKey = `live:calls:${callKey}`;
      //check xem có thuộc 2 event cần xóa không, nếu có thì xóa đi
      // Ghi đè toàn bộ object mỗi event — TTL tự dọn sau 1h
      const stateData :IDataState = {
        callKey,
        eventType: params.eventType,
        caller:    params.caller,
        callee:    params.callee,
        did:       params.did,
        startedAt: params.startedAt,
        updatedAt: params.updatedAt,
      };

      const pipeline = this.redis.pipeline();
      pipeline.set(redisKey, JSON.stringify(stateData)); 
      pipeline.expire(redisKey, Number(process.env.TTL));                  
      pipeline.sadd('live:calls:index', callKey);        
      await pipeline.exec();

    } catch (error) {
      this.logger.error(`updateCallState error: ${error.message}`);
    }
  }
    async getAllActiveCalls(): Promise<IDataState[]> {
    const callKeys = await this.redis.smembers('live:calls:index');
    if (!callKeys.length) return [];

    const pipeline = this.redis.pipeline();
    callKeys.forEach(key => pipeline.get(`live:calls:${key}`)); 
    const results = await pipeline.exec();

    if (!results) return [];
   return results
      .filter(([err, data]) => !err && data !== null)
      // 3. Ép kiểu kết quả JSON.parse thành DataState
      .map(([, data]) => JSON.parse(data as string) as IDataState);    
  }
}
