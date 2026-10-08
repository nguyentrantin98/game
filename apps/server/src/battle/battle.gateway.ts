import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { CHARACTERS, FireSchema, MoveSchema, QueueJoinSchema, WS, type FireInput } from '@army3d/shared';
import { AuthService } from '../auth/auth';
import { UserService } from '../user/user.service';
import { MatchmakingService } from './matchmaking.service';
import { RoomService } from './room.service';

interface SocketData {
  userId: string;
}

@WebSocketGateway({ cors: { origin: true }, path: '/ws' })
export class BattleGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UserService,
    private readonly rooms: RoomService,
    private readonly mm: MatchmakingService,
  ) {}

  afterInit(server: Server) {
    this.rooms.server = server;
  }

  handleConnection(client: Socket) {
    const userId = this.auth.verify(client.handshake.auth?.token as string | undefined);
    if (!userId) {
      client.emit(WS.error, { code: 'UNAUTHORIZED' });
      client.disconnect(true);
      return;
    }
    (client.data as SocketData).userId = userId;
    client.join(`user:${userId}`);
    // kết nối lại giữa trận → gửi snapshot
    const room = this.rooms.roomOf(userId);
    if (room && !room.state.over) {
      client.join(room.id);
      client.emit(WS.battleResume, { roomId: room.id, state: room.state, turn: this.rooms.turnInfo(room) });
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data as SocketData).userId;
    if (userId) this.mm.leave(userId);
  }

  private userId(client: Socket) {
    return (client.data as SocketData).userId;
  }

  @SubscribeMessage(WS.queueJoin)
  join(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    const parsed = QueueJoinSchema.safeParse(body);
    if (!parsed.success) return { ok: false, error: 'INVALID' };
    const userId = this.userId(client);
    if (this.rooms.roomOf(userId)) return { ok: false, error: 'IN_BATTLE' };
    const user = this.users.get(userId)!;
    const { mode, charId, skinId } = parsed.data;
    if (mode === 'practice') {
      const others = CHARACTERS.filter((c) => c.id !== charId);
      const botChar = others[Math.floor(Math.random() * others.length)];
      const room = this.rooms.create(
        [
          { id: userId, name: user.name, team: 0, charId, skinId },
          { id: `bot-${Date.now()}`, name: `${botChar.name} (AI)`, team: 1, charId: botChar.id, isBot: true },
        ],
        'practice',
      );
      this.rooms.start(room);
      return { ok: true, roomId: room.id };
    }
    this.mm.enqueue({ userId, name: user.name, elo: user.elo, charId, skinId: skinId ?? null, since: Date.now() });
    client.emit(WS.queueWaiting, { mode });
    return { ok: true, queued: true };
  }

  @SubscribeMessage(WS.queueLeave)
  leaveQueue(@ConnectedSocket() client: Socket) {
    this.mm.leave(this.userId(client));
    return { ok: true };
  }

  @SubscribeMessage(WS.battleFire)
  fire(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    const parsed = FireSchema.safeParse(body);
    if (!parsed.success) return { ok: false, error: 'INVALID' };
    const userId = this.userId(client);
    const room = this.rooms.roomOf(userId);
    if (!room) return { ok: false, error: 'NO_ROOM' };
    const res = this.rooms.fire(room, userId, parsed.data as FireInput);
    return res ? { ok: true } : { ok: false, error: 'NOT_YOUR_TURN' };
  }

  @SubscribeMessage(WS.battleMove)
  move(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    const parsed = MoveSchema.safeParse(body);
    if (!parsed.success) return { ok: false };
    const userId = this.userId(client);
    const room = this.rooms.roomOf(userId);
    if (room) this.rooms.move(room, userId, parsed.data.dx);
    return { ok: true };
  }

  @SubscribeMessage(WS.battleLeave)
  leaveBattle(@ConnectedSocket() client: Socket) {
    const userId = this.userId(client);
    const room = this.rooms.roomOf(userId);
    if (room) this.rooms.leave(room, userId);
    return { ok: true };
  }
}
