import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth';
import { BattleGateway } from './battle/battle.gateway';
import { MatchmakingService } from './battle/matchmaking.service';
import { RoomService } from './battle/room.service';
import { MetaController } from './meta/meta.controller';
import { UserModule } from './user/user.module';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]), UserModule, AuthModule],
  controllers: [MetaController],
  providers: [RoomService, MatchmakingService, BattleGateway, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
