/**
 * Admin auth client. Mirrors the Better Auth client API (better-auth 1.7:
 * signIn.email, twoFactor.verifyTotp/verifyBackupCode, requestPasswordReset,
 * resetPassword, getSession, signOut), so going live means replacing `authClient` with:
 *
 *   createAuthClient({
 *     baseURL: process.env.NEXT_PUBLIC_API_URL,
 *     fetchOptions: { credentials: "include" },
 *     plugins: [twoFactorClient(), adminClient()],
 *   })
 *
 * Mock credentials: admin@exactra.com.br / exactra123, 2FA code 123456.
 */

type Result<T> = Promise<{ data: T | null; error: { message: string; status: number } | null }>;
type Session = { user: { id: string; name: string; email: string; role: string } };

export const AUTH_IS_MOCK = true;

const KEY = "mock-admin-session";
const MOCK_USER = { id: "usr_admin", name: "Admin Exactra", email: "admin@exactra.com.br", role: "admin" };
const delay = () => new Promise((r) => setTimeout(r, 400));
const fail = (status: number, message: string) => ({ data: null, error: { status, message } });
let pending2fa = false;

export const authClient = {
  signIn: {
    async email({ email, password }: { email: string; password: string }): Result<{ twoFactorRedirect?: boolean }> {
      await delay();
      if (email !== MOCK_USER.email || password !== "exactra123") return fail(401, "INVALID_EMAIL_OR_PASSWORD");
      pending2fa = true;
      return { data: { twoFactorRedirect: true }, error: null };
    },
  },
  twoFactor: {
    async verifyTotp({ code }: { code: string; trustDevice?: boolean }): Result<Session> {
      await delay();
      if (!pending2fa || code !== "123456") return fail(401, "INVALID_CODE");
      sessionStorage.setItem(KEY, "1");
      return { data: { user: MOCK_USER }, error: null };
    },
    async verifyBackupCode({ code }: { code: string; trustDevice?: boolean }): Result<Session> {
      await delay();
      if (!pending2fa || code !== "backup-0001") return fail(401, "INVALID_BACKUP_CODE");
      sessionStorage.setItem(KEY, "1");
      return { data: { user: MOCK_USER }, error: null };
    },
  },
  async requestPasswordReset(input: { email: string; redirectTo: string }): Result<{ status: boolean }> {
    void input;
    await delay();
    return { data: { status: true }, error: null };
  },
  async resetPassword({ token }: { newPassword: string; token: string }): Result<{ status: boolean }> {
    await delay();
    return token ? { data: { status: true }, error: null } : fail(400, "INVALID_TOKEN");
  },
  async getSession(): Result<Session> {
    return sessionStorage.getItem(KEY) ? { data: { user: MOCK_USER }, error: null } : { data: null, error: null };
  },
  async signOut(): Result<{ success: boolean }> {
    sessionStorage.removeItem(KEY);
    return { data: { success: true }, error: null };
  },
};
