// Sentry starts from `node --import dist/instrument.mjs` (render*.yaml, package.json) so it loads before
// every dependency; this import only covers a start without the flag (same module, runs once).
import './instrument.js';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { setupApp } from './setup-app.js';

// Better Auth parses its own bodies; the auth module re-adds parsers for the other routes.
const app = setupApp(await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false }));
await app.listen(process.env.PORT ?? 3001);
