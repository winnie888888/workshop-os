import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { IsOptional, IsString, Length } from 'class-validator';
import { AuthService } from './auth.service';

/**
 * Auth, profile, and session endpoints. These are mounted behind the tenant-LESS
 * UserAuthMiddleware (see app.module), because they are exactly the routes a
 * just-logged-in user calls before choosing a tenant. /auth/config is the only
 * one that needs no auth at all and is additionally excluded from the
 * middleware so the SPA can read it to start login.
 */

class ProfileDto {
  @IsOptional() @IsString() @Length(1, 120) displayName?: string;
  @IsOptional() @IsString() @Length(2, 8) locale?: string;
  @IsOptional() @IsString() @Length(3, 40) phone?: string;
}

class HeartbeatDto {
  @IsOptional() @IsString() @Length(1, 100) deviceId?: string;
  @IsOptional() @IsString() @Length(1, 300) userAgent?: string;
  @IsOptional() @IsString() @Length(1, 60) ipHint?: string;
  @IsOptional() @IsString() expiresAt?: string;
}

class RevokeDto {
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() deviceId?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Public: client config to bootstrap the PKCE login (no auth).
  @Get('config')
  config() {
    return this.auth.authConfig();
  }

  // Authenticated (tenant-less): who am I + which tenants can I act in.
  @Get('me')
  me() {
    return this.auth.me();
  }

  @Post('session/heartbeat')
  heartbeat(@Body() dto: HeartbeatDto, @Req() req: Request) {
    return this.auth.heartbeat(dto, { ip: req.ip ?? null, userAgent: req.header('user-agent') ?? null });
  }

  @Get('sessions')
  sessions() {
    return this.auth.sessions();
  }

  @Post('logout')
  logout(@Body() dto: RevokeDto, @Req() req: Request) {
    return this.auth.revoke(dto.sessionId, dto.deviceId, { ip: req.ip ?? null, userAgent: req.header('user-agent') ?? null });
  }
}

@Controller('me')
export class ProfileController {
  constructor(private readonly auth: AuthService) {}

  @Get('profile')
  get() {
    return this.auth.me();
  }

  @Patch('profile')
  update(@Body() dto: ProfileDto) {
    return this.auth.updateProfile(dto);
  }
}
