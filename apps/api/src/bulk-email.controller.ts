import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { bulkEmailSchema, type BulkEmailInput } from '@exactra/shared';
import { setTimeout } from 'node:timers/promises';
import { prisma } from './db.js';
import { sendEmail } from './email.js';
import { ZodPipe } from './zod.pipe.js';

export function messageHtml(message: string): string {
  return `<div style="white-space:pre-wrap">${message.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)}</div>`;
}

@Roles(['admin'])
@Controller('admin/emails')
export class BulkEmailController {
  @Get('recipients')
  recipients() {
    return prisma.customer.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });
  }

  @Post()
  async send(@Body(new ZodPipe(bulkEmailSchema)) input: BulkEmailInput) {
    const ids = [...new Set(input.customerIds)];
    const customers = await prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } });
    if (customers.length !== ids.length) throw new BadRequestException('Um cliente não existe mais. Atualize a lista antes de enviar.');
    const html = messageHtml(input.message);
    let sent = 0;
    const failedCustomerIds: string[] = [];
    // shortcut: synchronous sends, use a durable queue when campaigns exceed 1000 customers.
    for (const [index, customer] of customers.entries()) {
      if (index) await setTimeout(600);
      try {
        await sendEmail({ to: customer.email, subject: input.subject, text: input.message, html });
        sent++;
      } catch {
        failedCustomerIds.push(customer.id);
      }
    }
    return { sent, failedCustomerIds };
  }
}
