import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller.js';
import { auth } from './auth.js';
import { CheckoutController } from './contracts/checkout.controller.js';
import { WebhookController } from './contracts/webhook.controller.js';
import { LeadsController } from './leads.controller.js';
import { PaymentProvider } from './payments/payment-provider.js';
import { StripeProvider } from './payments/stripe.provider.js';

@Module({
  // rawBody keeps req.rawBody for Stripe signature verification.
  imports: [AuthModule.forRoot({ auth, bodyParser: { rawBody: true } })],
  controllers: [AppController, LeadsController, CheckoutController, WebhookController],
  providers: [{ provide: PaymentProvider, useClass: StripeProvider }],
})
export class AppModule {}
