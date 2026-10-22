import { readdirSync, readFileSync } from 'node:fs';

process.env.BETTER_AUTH_SECRET ??= 'test-secret-test-secret-test-secret-123';
process.env.BETTER_AUTH_URL ??= 'http://localhost:3001';
process.env.WEB_ORIGIN ??= 'http://localhost:3000';
process.env.STRIPE_SECRET_KEY ??= 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET ??= 'whsec_test_secret';

// Swap Neon for an in-memory Postgres (PGlite) with the real migrations applied.
vi.mock('../src/db.js', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { PrismaPGlite } = await import('pglite-prisma-adapter');
  const { PrismaClient } = await import('../src/generated/prisma/client.js');
  const pg = new PGlite();
  // Every migration, in name order, like `prisma migrate deploy`.
  const dirs = readdirSync('prisma/migrations', { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const d of dirs.map((x) => x.name).sort()) {
    await pg.exec(readFileSync(`prisma/migrations/${d}/migration.sql`, 'utf8'));
  }
  return { prisma: new PrismaClient({ adapter: new PrismaPGlite(pg) }) };
});
