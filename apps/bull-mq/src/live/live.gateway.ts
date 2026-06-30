import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { LiveService} from './live.service';
import { InjectRedis } from '@nestjs-modules/ioredis';

import { Socket, Server } from 'socket.io';
import Redis from 'ioredis';
import { IDataState } from './types/type';
@WebSocketGateway({ cors: { origin: '*' } })
export class LiveGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() private server: Server;
  private subscriber: Redis;

  constructor(
    private readonly liveService: LiveService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.subscriber = this.redis.duplicate();
  }
  async afterInit() {
    await this.subscriber.subscribe('live:call_event');
    this.subscriber.on('message', (_channel, message) => {
      try {
        const payload = JSON.parse(message) as {
          eventId: string;
          data: IDataState;
        };

        // 4. Emit ra cho các client (Postman) đang kết nối
        this.server.emit('live:call_updated', {
          eventId: payload.eventId,
          eventType: payload.data.eventType,
          fromNumber: payload.data.caller,
          toNumber: payload.data.callee,
          did: payload.data.did,
          startedAt: payload.data.startedAt,
          updatedAt: payload.data.updatedAt,
        });
      } catch (error) {
        console.error('Error parsing redis message', error);
      }
    });
  }

  handleConnection(client: Socket) {
    console.log('new client connected', client.id);
    this.server.emit('test', 'dà kết nối');
  }
  handleDisconnect(client: Socket) {
    console.log('client disconnected', client.id);
  }

  async broadcastCallUpdate(eventId: string, params: IDataState) {
    // Ném tin nhắn vào Redis channel thay vì emit trực tiếp
    await this.redis.publish(
      'live:call_event',
      JSON.stringify({ eventId, data: params }),
    );
  }
}
