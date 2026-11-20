/** "3.588,00" → 358800. Empty or invalid input → 0. */
export function parseAmountCents(input: string): number {
  const reais = input.replace(/\./g, "").replace(",", ".");
  return Math.round(Number(reais) * 100) || 0;
}

export type CreateAdminError = "exists" | "password" | "generic";

/** Maps a Better Auth error code from admin/create-user to the message shown in the form. */
export function createAdminError(code?: string): CreateAdminError {
  if (code?.startsWith("USER_ALREADY_EXISTS")) return "exists";
  if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG") return "password";
  return "generic";
}
