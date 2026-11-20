import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { prisma } from './db.js';

@AllowAnonymous()
@Controller('health')
export class AppController {
  /** Liveness for the Render health check: no database, so a Neon pause or outage never restarts the API in a loop. */
  @Get()
  health() {
    return { ok: true };
  }

  /** Readiness / manual check: one light `SELECT 1` on the database. */
  @Get('db')
  async db() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, db: true };
    } catch {
      throw new ServiceUnavailableException({ ok: false, db: false });
    }
  }
}
