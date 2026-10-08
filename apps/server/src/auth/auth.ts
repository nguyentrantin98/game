import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Injectable,
  Module,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';

export const JWT_SECRET = process.env.JWT_SECRET || 'army3d-dev-secret-change-me';

export interface JwtPayload {
  sub: string;
}

const GuestSchema = z.object({
  deviceId: z.string().min(6).max(64),
  name: z.string().min(1).max(16).optional(),
});

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UserService,
  ) {}

  guestLogin(deviceId: string, name?: string) {
    const user = this.users.findOrCreateGuest(deviceId, name);
    const token = this.jwt.sign({ sub: user.id } satisfies JwtPayload);
    return { token, user: this.users.publicProfile(user) };
  }

  verify(token: string | undefined): string | null {
    if (!token) return null;
    try {
      const p = this.jwt.verify<JwtPayload>(token);
      return this.users.get(p.sub) ? p.sub : null;
    } catch {
      return null;
    }
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const userId = this.auth.verify(header?.replace(/^Bearer\s+/i, ''));
    if (!userId) throw new UnauthorizedException();
    req.userId = userId;
    return true;
  }
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Đăng nhập khách bằng deviceId — có thể bind tài khoản sau. */
  @Post('guest')
  guest(@Body() body: unknown) {
    const parsed = GuestSchema.safeParse(body);
    if (!parsed.success) throw new UnauthorizedException('deviceId không hợp lệ');
    return this.auth.guestLogin(parsed.data.deviceId, parsed.data.name);
  }
}

@Module({
  imports: [UserModule, JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '30d' } })],
  providers: [AuthService, JwtAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
