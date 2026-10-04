import { BadRequestException, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { prisma } from '../db.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PaymentProvider, type VerifiedWebhook } from '../payments/payment-provider.js';
import { notifyActivation } from '../notifications.js';
import { applyPaymentEvent } from './contract-lifecycle.js';

@AllowAnonymous()
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly payments: PaymentProvider) {}

  @Post('stripe')
  @HttpCode(200)
  async stripe(@Req() req: Request & { rawBody?: Buffer }, @Headers('stripe-signature') signature?: string) {
    let hook: VerifiedWebhook;
    try {
      hook = this.payments.verifyWebhook(req.rawBody ?? Buffer.alloc(0), signature ?? '');
    } catch {
      throw new BadRequestException('Invalid signature');
    }

    // Recording the event and applying it share one transaction: a duplicate delivery skips on the
    // unique stripeEventId and changes nothing; a failure rolls back so Stripe retries.
    const result = await prisma.$transaction(async (tx) => {
      const { count } = await tx.webhookEvent.createMany({
        data: { stripeEventId: hook.id, type: hook.type, payload: hook.payload as Prisma.InputJsonObject },
        skipDuplicates: true,
      });
      if (count === 0) return { duplicate: true, activated: null };
      return { duplicate: false, activated: hook.event ? await applyPaymentEvent(tx, hook.event) : null };
    });
    if (result.activated) await notifyActivation(result.activated);
    return result.duplicate ? { received: true, duplicate: true } : { received: true };
  }
}
