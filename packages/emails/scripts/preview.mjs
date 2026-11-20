/** Writes sample e-mails to .preview/ (git-ignored) from the built package. Run: pnpm --filter @exactra/emails preview */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  renderExpiryReminderEmail,
  renderNewContractNotice,
  renderPasswordResetEmail,
  renderTwoFactorCodeEmail,
  renderWelcomeEmail,
} from "../dist/index.mjs";

// Local logo: run `pnpm --filter web dev` (serves /email/logo.png) or set EMAIL_ASSET_BASE_URL.
process.env.EMAIL_ASSET_BASE_URL ||= "http://localhost:3000";

const out = join(import.meta.dirname, "..", ".preview");
mkdirSync(out, { recursive: true });

const card = { plan: "profissional", period: "MONTHLY", method: "CARD", amountCents: 39900, startsAt: "2026-10-04T15:00:00Z", endsAt: "2026-11-04T15:00:00Z" };
const pix = { plan: "essencial", period: "ANNUAL", method: "PIX", amountCents: 202980, startsAt: "2026-10-04T15:00:00Z", endsAt: "2027-10-04T15:00:00Z" };

/** @type {[string, Promise<{ subject: string, html: string, text: string }>][]} */
const samples = [
  ["welcome-card", renderWelcomeEmail({ customerName: "Maria Clara Souza", contract: card })],
  ["welcome-pix", renderWelcomeEmail({ customerName: "João Pereira", contract: pix })],
  [
    "new-contract",
    renderNewContractNotice({
      customer: { name: "Maria Clara Souza", email: "maria@exemplo.com", phone: "21999990000", document: "12345678909" },
      contract: { ...card, id: "cmg1abc2d0000xyz" },
      source: "Simulador (google / lancamento)",
      adminUrl: "http://localhost:3000/admin/contrato?id=cmg1abc2d0000xyz",
    }),
  ],
  ["password-reset", renderPasswordResetEmail({ name: "Admin Exactra", url: "http://localhost:3001/api/auth/reset-password/abc123?callbackURL=http%3A%2F%2Flocalhost%3A3000%2Fadmin%2Fredefinir-senha", expiresInMinutes: 60 })],
  ["two-factor-code", renderTwoFactorCodeEmail({ name: "Admin Exactra", code: "482913", expiresInMinutes: 3 })],
  ["expiry-reminder", renderExpiryReminderEmail({ customerName: "João Pereira", contract: { ...pix, endsAt: "2026-10-11T15:00:00Z" } })],
];

for (const [name, p] of samples) {
  const e = await p;
  writeFileSync(join(out, `${name}.html`), e.html);
  writeFileSync(join(out, `${name}.txt`), `Assunto: ${e.subject}\n\n${e.text}`);
  console.log(`${name}: ${e.subject}`);
}
console.log(`\nAbra os arquivos em ${out}`);
