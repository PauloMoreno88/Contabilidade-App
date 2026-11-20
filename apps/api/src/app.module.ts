import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AdminController } from './admin.controller.js';
import { BulkEmailController } from './bulk-email.controller.js';
import { EmailWebhookController } from './email-webhook.controller.js';
import { AppController } from './app.controller.js';
import { auth } from './auth.js';
import { CheckoutController } from './contracts/checkout.controller.js';
import { ExpiryJob } from './contracts/expiry.job.js';
import { WebhookController } from './contracts/webhook.controller.js';
import { LeadRetentionJob } from './lead-retention.job.js';
import { LeadsController } from './leads.controller.js';
import { MercadoPagoProvider } from './payments/mercado-pago.provider.js';
import { AccountController } from './portal/account.controller.js';
import { AdminPortalController } from './portal/admin-portal.controller.js';
import { PortalController } from './portal/portal.controller.js';
import { PortalJob } from './portal/portal.job.js';
import { LocalStorageController } from './storage/local-storage.controller.js';
import { createStorage, useLocalStorage } from './storage/storage.module.js';
import { StorageProvider } from './storage/storage-provider.js';

@Module({
  // rawBody keeps req.rawBody for the webhook signatures (Mercado Pago, Resend). CORS is set in setup-app.ts.
  imports: [
    SentryModule.forRoot(), // no-op until instrument.ts initialises Sentry (SENTRY_DSN)
    AuthModule.forRoot({ auth, bodyParser: { rawBody: true }, disableTrustedOriginsCors: true }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AppController,
    AdminController,
    BulkEmailController,
    EmailWebhookController,
    LeadsController,
    CheckoutController,
    WebhookController,
    AccountController,
    PortalController,
    AdminPortalController,
    // Dev and tests without R2: the API serves the signed upload/download URLs itself.
    ...(useLocalStorage() ? [LocalStorageController] : []),
  ],
  providers: [
    // Reports errors that are not HttpExceptions to Sentry, then answers like Nest's default filter.
    // Errors swallowed by the jobs are reported where they are caught.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    MercadoPagoProvider,
    { provide: StorageProvider, useFactory: createStorage },
    ExpiryJob,
    LeadRetentionJob,
    PortalJob,
  ],
})
export class AppModule {}
