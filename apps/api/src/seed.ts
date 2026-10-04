import { prisma } from './db.js';
import { seedAdmin } from './seed-admin.js';

const { ADMIN_SEED_EMAIL: email, ADMIN_SEED_PASSWORD: password } = process.env;
if (!email || !password) throw new Error('Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD');
console.log((await seedAdmin(email, password)) ? `Admin ${email} created` : `Admin ${email} already exists`);
await prisma.$disconnect();
