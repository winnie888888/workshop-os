import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { CommonModule } from './common/common.module';
import { CustomersModule } from './modules/customers/customers.module';
import { FleetsModule } from './modules/fleets/fleets.module';
import { AssetsModule } from './modules/assets/assets.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { ReceivingModule } from './modules/receiving/receiving.module';
import { OcrModule } from './modules/ocr/ocr-receiving.module';
import { PlateModule } from './modules/plate/plate-recognition.module';
import { VoiceModule } from './modules/voice/voice-workorder.module';
import { ManagerModule } from './modules/manager/workshop-manager.module';
import { RentalModule } from './modules/rental/rental.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { StockOpsModule } from './modules/stock-ops/stock-ops.module';
import { WarehouseReportingModule } from './modules/warehouse-reporting/warehouse-reporting.module';
import { WorkOrdersModule } from './modules/workorders/work-orders.module';
import { EstimatesModule } from './modules/estimates/estimates.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ActivityModule } from './modules/activity/activity.module';
import { WorkerModule } from './worker/worker.module';
import { SignupModule } from './modules/signup/signup.module';
import { SyncModule } from './modules/sync/sync.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { MinimaxModule } from './integrations/minimax/minimax.module';
import { EInvoiceModule } from './integrations/einvoice/einvoice.module';
import { AiModule } from './ai/ai-gateway.module';
import { PortalModule } from './portal/portal.module';
import { NotificationsModule } from './integrations/notifications/notifications.module';
// Phase 4A modules
import { StorageModule } from './storage/storage.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { SearchModule } from './modules/search/search.module';
import { AuthModule } from './auth/auth.module';
import { AuthTenantMiddleware } from './auth/auth-tenant.middleware';
import { UserAuthMiddleware } from './auth/user-auth.middleware';
import { PermissionsGuard } from './auth/permissions.guard';
import { ProblemExceptionFilter } from './common/errors/problem.filter';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    CommonModule,
    StorageModule,      // global STORAGE_PORT, used by AttachmentsModule
    AuthModule,         // login-time endpoints (config, me, profile, sessions)
    CustomersModule,
    FleetsModule,
    AssetsModule,
    InventoryModule,
    SuppliersModule,        // Warehouse 5.1: suppliers + supplier↔item catalogue
    PurchasingModule,       // Warehouse 5.2: purchase orders
    ReceivingModule,        // Warehouse 5.2: goods receipts (costed receive chokepoint)
    OcrModule,              // Phase 7: OCR-assisted receiving (extract → match → draft)
    PlateModule,            // Phase 8: plate recognition (read → match → confirm work order)
    VoiceModule,            // Phase 10: voice work orders (transcribe → extract → confirm)
    ManagerModule,          // Phase 11: AI Workshop Manager (advisory-only insights, read-only)
    RentalModule,           // Phase 12: vehicle rental management (fleet, reservations, contracts, charges)
    AttendanceModule,       // Phase 9: employee time & attendance (separate from work-order time)
    StockOpsModule,         // Warehouse 5.3: adjustments + counting
    WarehouseReportingModule, // Warehouse 5.3/5.4: valuation, low-stock, suggested POs
    WorkOrdersModule,
    EstimatesModule,    // quotes: appointment → work order → estimate → invoice chain
    AppointmentsModule, // advisor calendar (wall-clock bookings)
    ActivityModule,     // dashboard feed read from the audit chain
    WorkerModule,       // outbox drain loop (Minimax, e-invoice, notifications)
    SignupModule,       // /public: self-serve signup, verify, login (Faza A)
    AttachmentsModule,  // uploads (photos, voice notes, documents)
    SearchModule,       // global search
    SyncModule,
    InvoicesModule,
    ReportingModule,
    MinimaxModule,
    EInvoiceModule,
    AiModule,
    NotificationsModule,    // Customer Portal: provider-abstracted SMS/email/WhatsApp
    PortalModule,           // Customer Portal: customer-facing surface
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: ProblemExceptionFilter },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Login-time routes: the user is authenticated but has NOT yet chosen a
    // tenant, so they are bound by the tenant-LESS UserAuthMiddleware. These
    // are the routes a freshly logged-in SPA calls to discover its identity and
    // tenants and to manage profile/sessions.
    const userScoped = [
      'auth/me',
      'auth/sessions',
      'auth/session/heartbeat',
      'auth/logout',
      'me/profile',
    ];
    consumer.apply(UserAuthMiddleware).forRoutes(...userScoped);

    // Everything else is tenant-scoped and bound by AuthTenantMiddleware, which
    // additionally requires a verified membership for the X-Tenant-Id header.
    // We exclude:
    //  - health checks (no auth),
    //  - auth/config (public: the SPA reads it to START login),
    //  - the user-scoped routes above (already handled, tenant-less),
    //  - storage/local (authenticated by its own HMAC-signed URL).
    consumer
      .apply(AuthTenantMiddleware)
      .exclude(
        'health',
        'health/(.*)',
        'auth/config',
        // Self-serve vstop: pred avtentikacijo po definiciji (Faza A).
        'public',
        'public/(.*)',
        ...userScoped,
        'storage/local',
        'storage/local/(.*)',
        // Customer portal: governed by its OWN auth middleware (PortalModule),
        // never by the staff OIDC + X-Tenant-Id middleware. Excluded wholesale.
        'portal',
        'portal/(.*)',
      )
      .forRoutes('*');
  }
}
