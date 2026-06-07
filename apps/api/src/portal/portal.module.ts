import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { PortalAuthController, PortalController } from './portal.controller';
import { PortalAuthService } from './portal-auth.service';
import { PortalService } from './portal.service';
import { PortalAuthMiddleware } from './portal-auth.middleware';
import { NotificationsModule } from '../integrations/notifications/notifications.module';

/**
 * The customer portal as its own module. The auth middleware is applied to the
 * authenticated routes (everything under /portal) but NOT to the two public
 * sign-in routes (/portal/auth/request-link and /portal/auth/verify), because by
 * definition the caller has no session there yet. This is the same pattern the
 * staff app uses to keep its login endpoints public.
 */
@Module({
  imports: [NotificationsModule],
  controllers: [PortalAuthController, PortalController],
  providers: [PortalAuthService, PortalService],
  exports: [PortalAuthService],
})
export class PortalModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(PortalAuthMiddleware)
      // Public sign-in routes are excluded; everything else under /portal is
      // behind the customer session.
      .exclude(
        { path: 'portal/auth/request-link', method: RequestMethod.POST },
        { path: 'portal/auth/verify', method: RequestMethod.POST },
      )
      .forRoutes(PortalController);
  }
}
