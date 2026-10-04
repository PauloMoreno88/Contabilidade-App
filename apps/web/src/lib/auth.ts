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
// 2FA starts off; turn it on at /admin/seguranca to exercise the second step of the login.

const SESSION = "mock-admin-session";
const TWO_FA = "mock-admin-2fa";
const PASSWORD = "exactra123";
const BACKUP_CODES = ["backup-0001", "backup-0002", "backup-0003", "backup-0004", "backup-0005", "backup-0006"];
const MOCK_USER = { id: "usr_admin", name: "Admin Exactra", email: "admin@exactra.com.br", role: "admin" };
const delay = () => new Promise((r) => setTimeout(r, 400));
const ok = <T>(data: T) => ({ data, error: null });
const fail = (status: number, message: string) => ({ data: null, error: { status, message, statusText: message } });
const store = {
  get: (k: string) => sessionStorage.getItem(k) === "1",
  set: (k: string, on: boolean) => (on ? sessionStorage.setItem(k, "1") : sessionStorage.removeItem(k)),
};
const user = () => ({ ...MOCK_USER, twoFactorEnabled: store.get(TWO_FA) });
let pending2fa = false;
let enrolling = false;

function finishSignIn(valid: boolean) {
  if (!valid || !pending2fa) return fail(401, "INVALID_CODE");
  pending2fa = false;
  store.set(SESSION, true);
  return ok({ user: user() });
}

const mockClient = {
  signIn: {
    async email({ email, password }: { email: string; password: string }) {
      await delay();
      if (email !== MOCK_USER.email || password !== PASSWORD) return fail(401, "INVALID_EMAIL_OR_PASSWORD");
      if (!store.get(TWO_FA)) {
        store.set(SESSION, true);
        return ok({ user: user() });
      }
      pending2fa = true;
      return ok({ twoFactorRedirect: true, twoFactorMethods: ["totp", "otp"] });
    },
  },
  twoFactor: {
    async enable({ password }: { password: string }) {
      await delay();
      if (password !== PASSWORD) return fail(400, "INVALID_PASSWORD");
      enrolling = true;
      return ok({ totpURI: "otpauth://totp/Exactra:admin%40exactra.com.br?secret=JBSWY3DPEHPK3PXP&issuer=Exactra", backupCodes: BACKUP_CODES });
    },
    async verifyTotp({ code }: { code: string; trustDevice?: boolean }) {
      await delay();
      if (enrolling && store.get(SESSION)) {
        if (code !== "123456") return fail(401, "INVALID_CODE");
        enrolling = false;
        store.set(TWO_FA, true);
        return ok({ user: user() });
      }
      return finishSignIn(code === "123456");
    },
    async sendOtp() {
      await delay();
      return ok({ status: true });
    },
    async verifyOtp({ code }: { code: string; trustDevice?: boolean }) {
      await delay();
      return finishSignIn(code === "123456");
    },
    async verifyBackupCode({ code }: { code: string; trustDevice?: boolean }) {
      await delay();
      return finishSignIn(BACKUP_CODES.includes(code));
    },
    async generateBackupCodes({ password }: { password: string }) {
      await delay();
      return password === PASSWORD ? ok({ status: true, backupCodes: BACKUP_CODES.map((c) => c.replace("backup", "novo")) }) : fail(400, "INVALID_PASSWORD");
    },
    async disable({ password }: { password: string }) {
      await delay();
      if (password !== PASSWORD) return fail(400, "INVALID_PASSWORD");
      store.set(TWO_FA, false);
      return ok({ status: true });
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
    return ok(store.get(SESSION) ? { user: user() } : null);
  },
  async signOut() {
    store.set(SESSION, false);
    return ok({ success: true });
  },
};

// ponytail: the mock covers only the methods the panel calls; cast keeps one client type for the UI.
export const authClient = USE_MOCK ? (mockClient as unknown as typeof realClient) : realClient;
