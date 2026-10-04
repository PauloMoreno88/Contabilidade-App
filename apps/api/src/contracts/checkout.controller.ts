import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { randomBytes } from 'node:crypto';
import {
  allowedPeriods,
  createCheckoutSchema,
  totalPriceCents,
  type CheckoutResponse,
  type ContractStatusResponse,
  type CreateCheckoutInput,
} from '@exactra/shared';
import { prisma } from '../db.js';
import { webOrigin } from '../web-origin.js';
import { PaymentProvider } from '../payments/payment-provider.js';
import { ZodPipe } from '../zod.pipe.js';

@AllowAnonymous()
@Controller()
export class CheckoutController {
  constructor(private readonly payments: PaymentProvider) {}

  @Post('checkout/sessions')
  @HttpCode(201)
  async create(@Body(new ZodPipe(createCheckoutSchema)) input: CreateCheckoutInput): Promise<CheckoutResponse> {
    // CHECKOUT_ENABLED=false: only Stripe test keys are accepted (no real charges until prices are validated).
    if (!this.payments.configured || (this.payments.liveMode && process.env.CHECKOUT_ENABLED !== 'true')) {
      throw new ServiceUnavailableException('Contratação online indisponível no momento.');
    }
    if (!allowedPeriods(input.method).includes(input.period)) {
      throw new BadRequestException('Período não disponível para esta forma de pagamento.');
    }

    const lead = input.leadId ? await prisma.lead.findUnique({ where: { id: input.leadId } }) : null;
    const { customer } = input;
    const contract = await prisma.contract.create({
      data: {
        plan: input.plan,
        period: input.period,
        method: input.method,
        amountCents: totalPriceCents(input.plan, input.period),
        statusToken: randomBytes(24).toString('base64url'),
        customer: {
          create: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            document: customer.document.replace(/\D/g, ''),
            consentAt: new Date(),
            leadId: lead?.id,
          },
        },
      },
    });

    try {
      const query = `contract=${contract.id}&token=${contract.statusToken}`;
      const session = await this.payments.createCheckout({
        contractId: contract.id,
        plan: contract.plan,
        period: contract.period,
        method: contract.method,
        amountCents: contract.amountCents,
        customer: { name: customer.name, email: customer.email },
        successUrl: `${webOrigin()}/checkout/status?${query}`,
        cancelUrl: `${webOrigin()}/checkout?cancelado=1`,
      });
      await prisma.contract.update({ where: { id: contract.id }, data: { stripeSessionId: session.sessionId } });
      return { contractId: contract.id, checkoutUrl: session.url, statusToken: contract.statusToken };
    } catch (err) {
      await prisma.contract.delete({ where: { id: contract.id } });
      await prisma.customer.delete({ where: { id: contract.customerId } });
      throw err;
    }
  }

  @Get('contracts/:id/status')
  async status(@Param('id') id: string, @Query('token') token?: string): Promise<ContractStatusResponse> {
    const c = token ? await prisma.contract.findFirst({ where: { id, statusToken: token } }) : null;
    if (!c) throw new NotFoundException();
    return { contractId: c.id, status: c.status, method: c.method, plan: c.plan, period: c.period };
  }
}
