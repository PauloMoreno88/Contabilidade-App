import type { NestExpressApplication } from '@nestjs/platform-express';
import { webOrigins } from './web-origin.js';

/** Shared by main.ts and the e2e tests. */
export function setupApp(app: NestExpressApplication): NestExpressApplication {
  app.set('trust proxy', 1); // Render sits behind a proxy (real client IP for rate limiting)
  app.enableCors({
    origin: webOrigins(),
    credentials: true, // Better Auth session cookie
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'], // CSV filename
    maxAge: 86400,
  });
  return app;
}
