import { BadRequestException, Controller, HttpCode, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { Resend } from 'resend';
import { z } from 'zod';
import { prisma } from './db.js';
import type { EmailDeliveryStatus } from './generated/prisma/client.js';

const eventSchema = z.object({
  type: z.string(), created_at: z.string().datetime({ offset: true }),
  data: z.object({ email_id: z.string().min(1), tags: z.record(z.string()).optional() }),
});
const statuses: Record<string, EmailDeliveryStatus | undefined> = {
  'email.sent': 'SENT', 'email.delivered': 'DELIVERED', 'email.failed': 'FAILED',
  'email.bounced': 'FAILED', 'email.suppressed': 'FAILED', 'email.delivery_delayed': 'PENDING',
};

@AllowAnonymous()
@Controller('webhooks/resend')
export class EmailWebhookController {
  @Post()
  @HttpCode(200)
  async receive(@Req() req: Request & { rawBody?: Buffer }) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) throw new ServiceUnavailableException('Resend webhook is not configured');
    let verified: unknown;
    try {
      verified = new Resend(process.env.RESEND_API_KEY ?? 'webhook-verification').webhooks.verify({
        payload: req.rawBody?.toString('utf8') ?? '', webhookSecret: secret,
        headers: { id: req.get('svix-id') ?? '', timestamp: req.get('svix-timestamp') ?? '', signature: req.get('svix-signature') ?? '' },
      });
    } catch {
      throw new BadRequestException('Invalid signature');
    }
    const parsed = eventSchema.safeParse(verified);
    if (!parsed.success) return { received: true };
    const event = parsed.data;
    const status = statuses[event.type];
    if (!status) return { received: true };
    const id = event.data.tags?.bulk_recipient_id;
    const at = new Date(event.created_at);
    // One conditional write makes retries idempotent and prevents old events undoing delivery.
    await prisma.emailRecipient.updateMany({
      where: {
        ...(id ? { id } : { providerMessageId: event.data.email_id }),
        AND: [
          { OR: [{ providerMessageId: null }, { providerMessageId: event.data.email_id }] },
          { OR: [{ lastEventAt: null }, { lastEventAt: { lt: at } }, ...(status === 'DELIVERED' || status === 'FAILED' ? [{ lastEventAt: at, status: { in: ['PENDING', 'SENT'] as EmailDeliveryStatus[] } }] : [])] },
          ...(status === 'SENT' || status === 'PENDING' ? [{ status: { in: ['PENDING', 'SENT'] as EmailDeliveryStatus[] } }] : []),
        ],
      },
      data: { status, providerMessageId: event.data.email_id, lastEventAt: at },
    });
    return { received: true };
  }
}
