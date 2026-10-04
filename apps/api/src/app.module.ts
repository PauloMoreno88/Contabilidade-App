import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller.js';
import { LeadsController } from './leads.controller.js';
import { auth } from './auth.js';

@Module({
  // rawBody keeps req.rawBody for Stripe signature verification.
  imports: [AuthModule.forRoot({ auth, bodyParser: { rawBody: true } })],
  controllers: [AppController, LeadsController],
})
export class AppModule {}
