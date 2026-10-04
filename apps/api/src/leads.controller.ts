import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { calculateSimulation, createLeadSchema, type CreateLeadInput } from '@exactra/shared';
import { prisma } from './db.js';
import { ZodPipe } from './zod.pipe.js';

@Controller('leads')
export class LeadsController {
  @AllowAnonymous()
  @Post()
  @HttpCode(201)
  async create(@Body(new ZodPipe(createLeadSchema)) input: CreateLeadInput) {
    // Never trust the client's result: recompute it with the current rules.
    const result = calculateSimulation(input.answers);
    const lead = await prisma.lead.create({
      data: {
        name: input.name,
        whatsapp: input.whatsapp,
        email: input.email,
        answers: input.answers,
        result,
        rulesVersion: result.rulesVersion,
        utm: input.utm,
        consentAt: new Date(),
      },
    });
    return { id: lead.id, result };
  }
}
