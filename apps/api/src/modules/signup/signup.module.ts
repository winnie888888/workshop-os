import { Body, Controller, Headers, Ip, Module, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import { NotificationsModule } from '../../integrations/notifications/notifications.module';
import { SignupService } from './signup.service';

/**
 * /public/* — edine poti brez avtentikacijskega middleware-a (izvzete v
 * app.module poleg health in auth/config). Vse tri so namerno POST (nič
 * stanja v URL-jih razen verifikacijskega žetona, ki ga SPA prebere iz
 * querystringa in pošlje v telesu). Enumeration zaščita, rate limiti in
 * Turnstile živijo v servisu.
 */

class SignupDto {
  @IsEmail() email!: string;
  @IsString() @Length(10, 200) password!: string;
  @IsString() @Length(2, 120) workshopName!: string;
  @IsOptional() @IsString() turnstileToken?: string;
}

class VerifyDto {
  @IsString() @Length(64, 64) token!: string; // 32 B hex
}

class LoginDto {
  @IsEmail() email!: string;
  @IsString() @Length(1, 200) password!: string;
}

@Controller('public')
export class SignupController {
  constructor(private readonly signup: SignupService) {}

  // Anti-spam: 5 registracij na 10 minut na IP (override globalnih 120).
  @Throttle({ default: { ttl: 600_000, limit: 5 } })
  @Post('signup')
  request(@Body() dto: SignupDto, @Ip() ip: string) {
    return this.signup.requestSignup(dto, ip || 'unknown');
  }

  // Omeji poskuse uveljavljanja žetona: 10 na minuto na IP.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('verify')
  verify(@Body() dto: VerifyDto) {
    return this.signup.verify(dto.token);
  }

  // Brute-force zaščita: 5 poskusov gesla na minuto na IP (override globalnih 120).
  // Lockout na račun (5 napak → 15 min) je dodatna plast v servisu.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Ip() ip: string, @Headers('user-agent') userAgent?: string) {
    return this.signup.login(dto, ip || 'unknown', userAgent ?? null);
  }
}

@Module({
  imports: [NotificationsModule], // NOTIFICATION_PORT za verifikacijski e-mail
  controllers: [SignupController],
  providers: [SignupService],
})
export class SignupModule {}
