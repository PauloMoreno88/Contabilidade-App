import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

// Better Auth parses its own bodies; the auth module re-adds parsers for the other routes.
const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
app.set('trust proxy', 1); // Render sits behind a proxy (real client IP for rate limiting)
await app.listen(process.env.PORT ?? 3001);
