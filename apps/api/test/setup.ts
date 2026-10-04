import { readFileSync } from 'node:fs';

process.env.BETTER_AUTH_SECRET ??= 'test-secret-test-secret-test-secret-123';
process.env.BETTER_AUTH_URL ??= 'http://localhost:3001';
process.env.WEB_ORIGIN ??= 'http://localhost:3000';

// Swap Neon for an in-memory Postgres (PGlite) with the real migrations applied.
vi.mock('../src/db.js', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { PrismaPGlite } = await import('pglite-prisma-adapter');
  const { PrismaClient } = await import('../src/generated/prisma/client.js');
  const pg = new PGlite();
  await pg.exec(readFileSync('prisma/migrations/0_init/migration.sql', 'utf8'));
  return { prisma: new PrismaClient({ adapter: new PrismaPGlite(pg) }) };
});
