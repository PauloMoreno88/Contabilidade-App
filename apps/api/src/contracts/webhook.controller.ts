import { BadRequestException, Controller, Headers, HttpCode, Post, Query, Req } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { prisma } from '../db.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { PaymentEvent, VerifiedWebhook } from '../payments/payment-provider.js';
import { InvalidMercadoPagoNotification, MercadoPagoProvider } from '../payments/mercado-pago.provider.js';
import { notifyActivation, sendPaymentAlert, type PaymentAlert } from '../notifications.js';
import { applyPaymentEvent } from './contract-lifecycle.js';

@AllowAnonymous()
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly mercadoPago: MercadoPagoProvider) {}

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
    const { apply, alert } = hook.event ? await this.review(hook.event) : { apply: false, alert: null };
    // Recording the event and applying it share one transaction: a duplicate delivery skips on the
    // unique eventId and changes nothing;
    // a failure rolls back so Mercado Pago retries.
    const result = await prisma.$transaction(async (tx) => {
      const { count } = await tx.webhookEvent.createMany({
        data: { eventId: hook.id, type: hook.type, payload: hook.payload as Prisma.InputJsonObject },
        skipDuplicates: true,
      });
      if (count === 0) return { duplicate: true, activated: null };
      return { duplicate: false, activated: apply ? await applyPaymentEvent(tx, hook.event!) : null };
    });
    if (result.activated) await notifyActivation(result.activated);
    if (alert && !result.duplicate) await sendPaymentAlert(alert);
    return result.duplicate ? { received: true, duplicate: true } : { received: true };
  }

  /** Decides whether an event may change the contract, and whether the Exactra team must look at it. */
  private async review(ev: PaymentEvent): Promise<{ apply: boolean; alert: PaymentAlert | null }> {
    if (ev.type === 'payment.attention') {
      return { apply: false, alert: { reason: ev.reason, contractId: ev.contractId, paymentId: ev.mercadoPagoPaymentId } };
    }
    if (ev.type === 'payment.reversed') {
      // A contract paid twice stays active when the extra payment is the one refunded.
      const paid = await prisma.payment.count({ where: { contractId: ev.contractId, mercadoPagoPaymentId: ev.mercadoPagoPaymentId } });
      const reason = paid ? ev.reason : 'REVERSAL_NOT_APPLIED';
      return { apply: Boolean(paid), alert: { reason, contractId: ev.contractId, paymentId: ev.mercadoPagoPaymentId } };
    }
    const contract = await prisma.contract.findUnique({ where: { id: ev.contractId } });
    const matches = contract?.provider === ev.provider && contract.amountCents === ev.amountCents;
    // The money is already in: a 4xx would only make Mercado Pago retry, so warn a person instead.
    const reason = !matches ? 'PAYMENT_MISMATCH' : contract.status !== 'PENDING_PAYMENT' ? 'PAYMENT_NOT_NEEDED' : null;
    return {
      apply: !reason,
      alert: reason && { reason, contractId: ev.contractId, paymentId: ev.mercadoPagoPaymentId, amountCents: ev.amountCents },
    };
  }
}
