// Where people land after signing in. Kept apart from auth.ts (which creates the Better Auth client) so it can be unit tested.

/** Where each role lands after signing in. */
export const homeFor = (role?: string | null) => (role === "admin" ? "/admin/mes" : "/app");

/** Only paths inside the site, so ?next= cannot send people elsewhere. */
export const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

/** ?next= only when it belongs to the role's area: a customer never lands on /admin, and the reverse. */
export function destinationFor(role: string | null | undefined, next: string | null) {
  const fits = next && (role === "admin" ? next.startsWith("/admin") : next.startsWith("/app"));
  return fits ? next : homeFor(role);
}
