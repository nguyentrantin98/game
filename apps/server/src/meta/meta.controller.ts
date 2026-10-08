import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CHARACTERS, SKINS } from '@army3d/shared';
import { JwtAuthGuard } from '../auth/auth';
import { CHECKIN_REWARDS, UserService } from '../user/user.service';

interface AuthedReq {
  userId: string;
}

@ApiTags('meta')
@Controller()
export class MetaController {
  constructor(private readonly users: UserService) {}

  @Get('health')
  health() {
    return { ok: true, time: Date.now() };
  }

  @Get('characters')
  characters() {
    return { characters: CHARACTERS, skins: SKINS };
  }

  @Get('rank')
  rank() {
    return this.users.leaderboard();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthedReq) {
    return this.users.publicProfile(this.users.get(req.userId)!);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('checkin')
  checkinInfo(@Req() req: AuthedReq) {
    const u = this.users.get(req.userId)!;
    return { day: u.checkInDay, canCheckIn: this.users.canCheckIn(u), rewards: CHECKIN_REWARDS };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('checkin')
  checkin(@Req() req: AuthedReq) {
    const r = this.users.checkIn(req.userId);
    return { ok: r.ok, reward: r.ok ? r.reward : 0, user: this.users.publicProfile(r.user) };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('mails')
  mails(@Req() req: AuthedReq) {
    return this.users.get(req.userId)!.mails;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('mails/:id/claim')
  claim(@Req() req: AuthedReq, @Param('id') id: string, @Body() _b: unknown) {
    return this.users.publicProfile(this.users.claimMail(req.userId, id));
  }
}
