import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { CALL_END_EVENTS, IDataState } from './types/type';
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
      
      const pipeline = this.redis.pipeline();
      if(CALL_END_EVENTS.includes(params.eventType))
      {
        //xoa key call đang hoạt động
         pipeline.del(redisKey);
        //xóa luôn lưu hHSET 
        pipeline.srem('live:calls:index', callKey);
        await pipeline.exec();
        return;
      }
      const stateData :IDataState = {
        callKey: params.callKey,
        eventType: params.eventType,
        caller:    params.caller,
        callee:    params.callee,
        did:       params.did,
        startedAt: params.startedAt,
        updatedAt: params.updatedAt,
      };
      pipeline.set(redisKey, JSON.stringify(stateData)); 
      pipeline.expire(redisKey, Number(process.env.TTL));              
      pipeline.sadd('live:calls:index', callKey);        
      await pipeline.exec();

    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
