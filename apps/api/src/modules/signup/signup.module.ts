import { Body, Controller, Ip, Module, Post } from '@nestjs/common';
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

  @Post('signup')
  request(@Body() dto: SignupDto, @Ip() ip: string) {
    return this.signup.requestSignup(dto, ip || 'unknown');
  }

  @Post('verify')
  verify(@Body() dto: VerifyDto) {
    return this.signup.verify(dto.token);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.signup.login(dto, ip || 'unknown');
  }
}

@Module({
  imports: [NotificationsModule], // NOTIFICATION_PORT za verifikacijski e-mail
  controllers: [SignupController],
  providers: [SignupService],
})
export class SignupModule {}
