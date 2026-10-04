import { createAuthClient } from "better-auth/react";
import { adminClient, twoFactorClient } from "better-auth/client/plugins";
import { USE_MOCK } from "@/lib/api";

/**
 * Better Auth client for the admin panel. The session cookie is set by
 * api.* and shared with www.* (AUTH_COOKIE_DOMAIN on the API), so every
 * call goes with credentials.
 */
const realClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  fetchOptions: { credentials: "include" },
  plugins: [twoFactorClient(), adminClient()],
});

export const AUTH_IS_MOCK = USE_MOCK;

// ---- Mock (NEXT_PUBLIC_USE_MOCK=true): admin@exactra.com.br / exactra123, 2FA code 123456 ----

const KEY = "mock-admin-session";
const MOCK_USER = { id: "usr_admin", name: "Admin Exactra", email: "admin@exactra.com.br", role: "admin" };
const delay = () => new Promise((r) => setTimeout(r, 400));
const ok = <T>(data: T) => ({ data, error: null });
const fail = (status: number, message: string) => ({ data: null, error: { status, message, statusText: message } });
let pending2fa = false;

const mockClient = {
  signIn: {
    async email({ email, password }: { email: string; password: string }) {
      await delay();
      if (email !== MOCK_USER.email || password !== "exactra123") return fail(401, "INVALID_EMAIL_OR_PASSWORD");
      pending2fa = true;
      return ok({ twoFactorRedirect: true });
    },
  },
  twoFactor: {
    async verifyTotp({ code }: { code: string; trustDevice?: boolean }) {
      await delay();
      if (!pending2fa || code !== "123456") return fail(401, "INVALID_CODE");
      sessionStorage.setItem(KEY, "1");
      return ok({ user: MOCK_USER });
    },
    async verifyBackupCode({ code }: { code: string; trustDevice?: boolean }) {
      await delay();
      if (!pending2fa || code !== "backup-0001") return fail(401, "INVALID_BACKUP_CODE");
      sessionStorage.setItem(KEY, "1");
      return ok({ user: MOCK_USER });
    },
  },
  async requestPasswordReset(input: { email: string; redirectTo: string }) {
    void input;
    await delay();
    return ok({ status: true });
  },
  async resetPassword({ token }: { newPassword: string; token: string }) {
    await delay();
    return token ? ok({ status: true }) : fail(400, "INVALID_TOKEN");
  },
  async getSession() {
    return ok(sessionStorage.getItem(KEY) ? { user: MOCK_USER } : null);
  },
  async signOut() {
    sessionStorage.removeItem(KEY);
    return ok({ success: true });
  },
};

// ponytail: the mock covers only the methods the panel calls; cast keeps one client type for the UI.
export const authClient = USE_MOCK ? (mockClient as unknown as typeof realClient) : realClient;
