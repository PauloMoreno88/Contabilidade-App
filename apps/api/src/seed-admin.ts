import { auth } from './auth.js';
import { prisma } from './db.js';

/** Creates the first admin. Returns false when the e-mail already exists, so it is safe to run again. */
export async function seedAdmin(email: string, password: string): Promise<boolean> {
  if (await prisma.user.findUnique({ where: { email } })) return false;
  await auth.api.createUser({ body: { email, password, name: 'Administrador', role: 'admin' } });
  return true;
}
