import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { activateAccountSchema, type ActivateAccountInput, type InviteInfo } from '@exactra/shared';
import { auth } from '../auth.js';
import { prisma } from '../db.js';
import { ZodPipe } from '../zod.pipe.js';
import { hashToken } from './invites.js';

const INVALID = 'Este link expirou ou já foi usado. Peça um novo pelo WhatsApp.';

async function validInvite(token: string | undefined) {
  if (!token) throw new BadRequestException(INVALID);
  const invite = await prisma.customerInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { memberships: { include: { customer: true }, orderBy: { createdAt: 'asc' }, take: 1 } } } },
  });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) throw new BadRequestException(INVALID);
  return invite;
}

/** Public: the activation link from the invite e-mail. The front then signs in with the new password. */
@AllowAnonymous()
@Controller('account')
export class AccountController {
  @Get('invite')
  async invite(@Query('token') token?: string): Promise<InviteInfo> {
    const { user } = await validInvite(token);
    return { email: user.email, name: user.name, companyName: user.memberships[0]?.customer.name ?? null };
  }

  @Post('activate')
  @HttpCode(200)
  async activate(@Body(new ZodPipe(activateAccountSchema)) input: ActivateAccountInput) {
    const invite = await validInvite(input.token);
    const ctx = await auth.$context;
    const hash = await ctx.password.hash(input.password);
    const credential = await prisma.account.findFirst({ where: { userId: invite.userId, providerId: 'credential' } });
    if (credential) await ctx.internalAdapter.updatePassword(invite.userId, hash);
    else await ctx.internalAdapter.linkAccount({ userId: invite.userId, providerId: 'credential', accountId: invite.userId, password: hash });
    await prisma.$transaction([
      prisma.customerInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
      // The invite reached this inbox: the e-mail is verified.
      prisma.user.update({ where: { id: invite.userId }, data: { emailVerified: true } }),
    ]);
    return { email: invite.user.email };
  }
}
