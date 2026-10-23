import { createAuthClient } from "better-auth/react";
import { adminClient, magicLinkClient, twoFactorClient } from "better-auth/client/plugins";
import { USE_MOCK } from "@/lib/api";

/**
 * Better Auth client for the admin panel and the customer area. The session
 * cookie is set by api.* and shared with www.* (AUTH_COOKIE_DOMAIN on the API),
 * so every call goes with credentials.
 */
const realClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  fetchOptions: { credentials: "include" },
  plugins: [twoFactorClient(), adminClient(), magicLinkClient()],
});

export const AUTH_IS_MOCK = USE_MOCK;

/** Where each role lands after signing in. */
export const homeFor = (role?: string | null) => (role === "admin" ? "/admin/mes" : "/app");

// ---- Mock (NEXT_PUBLIC_USE_MOCK=true), password exactra123, 2FA code 123456 ----
// admin@exactra.com.br (team) and cliente@exactra.com.br (customer area).
// 2FA starts off; turn it on in the security page to exercise the second step of the login.

const SESSION = "mock-session-user";
const TWO_FA = "mock-2fa";
const PASSWORD = "exactra123";
const BACKUP_CODES = ["backup-0001", "backup-0002", "backup-0003", "backup-0004", "backup-0005", "backup-0006"];
const MOCK_USERS = {
  "admin@exactra.com.br": { id: "usr_admin", name: "Admin Exactra", email: "admin@exactra.com.br", role: "admin" },
  "cliente@exactra.com.br": { id: "usr_cliente", name: "Marina Costa", email: "cliente@exactra.com.br", role: "customer" },
} as const;
type MockEmail = keyof typeof MOCK_USERS;
const delay = () => new Promise((r) => setTimeout(r, 400));
const ok = <T>(data: T) => ({ data, error: null });
const fail = (status: number, message: string) => ({ data: null, error: { status, message, statusText: message } });
const read = (k: string) => sessionStorage.getItem(k);
const twoFa = (email: string) => read(`${TWO_FA}:${email}`) === "1";
const setTwoFa = (email: string, on: boolean) => (on ? sessionStorage.setItem(`${TWO_FA}:${email}`, "1") : sessionStorage.removeItem(`${TWO_FA}:${email}`));
const current = () => read(SESSION) as MockEmail | null;
const user = (email: MockEmail) => ({ ...MOCK_USERS[email], twoFactorEnabled: twoFa(email) });
let pending2fa: MockEmail | null = null;
let enrolling = false;

function finishSignIn(valid: boolean) {
  if (!valid || !pending2fa) return fail(401, "INVALID_CODE");
  sessionStorage.setItem(SESSION, pending2fa);
  const u = user(pending2fa);
  pending2fa = null;
  return ok({ user: u });
}

const mockClient = {
  signIn: {
    async email({ email, password }: { email: string; password: string }) {
      await delay();
      const e = email.toLowerCase() as MockEmail;
      if (!MOCK_USERS[e] || password !== PASSWORD) return fail(401, "INVALID_EMAIL_OR_PASSWORD");
      if (!twoFa(e)) {
        sessionStorage.setItem(SESSION, e);
        return ok({ user: user(e) });
      }
      pending2fa = e;
      return ok({ twoFactorRedirect: true, twoFactorMethods: ["totp", "otp"] });
    },
    async magicLink(input: { email: string; callbackURL: string }) {
      void input;
      await delay();
      return ok({ status: true });
    },
  },
  twoFactor: {
    async enable({ password }: { password: string }) {
      await delay();
      if (password !== PASSWORD) return fail(400, "INVALID_PASSWORD");
      enrolling = true;
      return ok({ totpURI: "otpauth://totp/Exactra:conta?secret=JBSWY3DPEHPK3PXP&issuer=Exactra", backupCodes: BACKUP_CODES });
    },
    async verifyTotp({ code }: { code: string; trustDevice?: boolean }) {
      await delay();
      const me = current();
      if (enrolling && me) {
        if (code !== "123456") return fail(401, "INVALID_CODE");
        enrolling = false;
        setTwoFa(me, true);
        return ok({ user: user(me) });
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
      const me = current();
      if (password !== PASSWORD || !me) return fail(400, "INVALID_PASSWORD");
      setTwoFa(me, false);
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
    const me = current();
    return ok(me && MOCK_USERS[me] ? { user: user(me) } : null);
  },
  async signOut() {
    sessionStorage.removeItem(SESSION);
    return ok({ success: true });
  },
};

// ponytail: the mock covers only the methods the UI calls; cast keeps one client type for the UI.
export const authClient = USE_MOCK ? (mockClient as unknown as typeof realClient) : realClient;
