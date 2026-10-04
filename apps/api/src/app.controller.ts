import { Controller, Get } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller()
export class AppController {
  @AllowAnonymous()
  @Get('health')
  health() {
    return { ok: true };
  }
}
