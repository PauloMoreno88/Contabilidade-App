import { BadRequestException, Controller, Headers, HttpCode, Post, Query, Req } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { prisma } from '../db.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PaymentProvider, type VerifiedWebhook } from '../payments/payment-provider.js';
import { InvalidMercadoPagoNotification, MercadoPagoProvider } from '../payments/mercado-pago.provider.js';
import { notifyActivation } from '../notifications.js';
import { applyPaymentEvent } from './contract-lifecycle.js';

@AllowAnonymous()
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly payments: PaymentProvider, private readonly mercadoPago: MercadoPagoProvider) {}

  @Post('stripe')
  @HttpCode(200)
  async stripe(@Req() req: Request & { rawBody?: Buffer }, @Headers('stripe-signature') signature?: string) {
    let hook: VerifiedWebhook;
    try {
      hook = await this.payments.verifyWebhook(req.rawBody ?? Buffer.alloc(0), signature ?? '');
    } catch {
      throw new BadRequestException('Invalid signature');
    }

    return this.process(hook);
  }

  @Post('mercado-pago')
  @HttpCode(200)
  async mercadoPagoWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
    @Query('data.id') dataId?: string,
  ) {
    let hook: VerifiedWebhook;
    try {
      hook = await this.mercadoPago.verifyWebhook(req.rawBody ?? Buffer.alloc(0), signature ?? '', requestId, dataId);
    } catch (err) {
      if (err instanceof InvalidMercadoPagoNotification) throw new BadRequestException('Invalid signature or notification');
      throw err; // A payment API outage must return 5xx so Mercado Pago retries.
    }
    return this.process(hook);
  }

  private async process(hook: VerifiedWebhook) {
    if (hook.event?.type === 'prepaid.paid') {
      const contract = await prisma.contract.findUnique({ where: { id: hook.event.contractId } });
      // shortcut: a split payment does not activate the contract; reconcile merchant orders if that option is enabled.
      if (!contract || contract.provider !== hook.event.provider || contract.amountCents !== hook.event.amountCents) {
        throw new BadRequestException('Payment does not match contract');
      }
    }
    // Recording the event and applying it share one transaction: a duplicate delivery skips on the
    // unique stripeEventId and changes nothing; a failure rolls back so the provider retries.
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
