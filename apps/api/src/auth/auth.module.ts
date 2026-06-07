import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController, ProfileController } from './auth.controller';

/**
 * Auth module — exposes the login-time endpoints (config, me, profile,
 * sessions). It relies on the global CommonModule for PgService and AppConfig.
 * The middleware that authenticates these routes (UserAuthMiddleware) is wired
 * in app.module, not here, because middleware binding is application-level.
 */
@Module({
  controllers: [AuthController, ProfileController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
