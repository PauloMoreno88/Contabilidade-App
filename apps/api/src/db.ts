import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export const prisma = new PrismaClient({
  // Keep idle connections for 4 min (pg default: 10 s) so requests skip the TLS handshake to the database.
  // Below Neon's 5 min scale-to-zero: an idle pool does not keep the compute awake.
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, idleTimeoutMillis: 4 * 60_000 }),
});
