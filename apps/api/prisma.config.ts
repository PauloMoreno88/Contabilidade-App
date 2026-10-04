import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile();
} catch {
  // no .env file: rely on the real environment
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // CLI (migrations) needs Neon's direct connection; the app uses the pooled DATABASE_URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
