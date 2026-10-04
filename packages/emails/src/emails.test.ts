import { describe, expect, it } from "vitest";
import {
  renderExpiryReminderEmail,
  renderNewContractNotice,
  renderPasswordResetEmail,
  renderTwoFactorCodeEmail,
  renderWelcomeEmail,
  type EmailContent,
} from "./index";

const evil = `<script>alert(1)</script>"><img src=x onerror=alert(2)>`;
const contract = { plan: "profissional", period: "MONTHLY", method: "CARD", amountCents: 39900, startsAt: "2026-10-04T15:00:00Z", endsAt: "2026-11-04T15:00:00Z" } as const;
const prepaid = { plan: "essencial", period: "ANNUAL", method: "BOLETO", amountCents: 202980, startsAt: "2026-10-04T15:00:00Z", endsAt: "2027-10-04T15:00:00Z" } as const;

function expectSafe(e: EmailContent) {
  expect(e.subject).not.toMatch(/[\r\n]/);
  expect(e.html).toMatch(/^<!DOCTYPE html/i);
  expect(e.text.length).toBeGreaterThan(50);
  expect(e.text).not.toMatch(/<\/?(table|td|div|p)\b/i);
  expect(e.html).not.toContain("<script>alert(1)</script>");
  expect(e.html).not.toContain("<img src=x");
}

describe("e-mails", () => {
  it("welcome: personalized html + text, user data escaped", async () => {
    const e = await renderWelcomeEmail({ customerName: `${evil} Souza`, contract });
    expectSafe(e);
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).toMatch(/R\$\s399,00/);
    for (const s of [e.html, e.text]) {
      expect(s).toContain("Profissional");
      expect(s).toContain("04/11/2026");
      expect(s).toContain("Envie seus documentos");
      expect(s).toContain("Comprovante de endereço");
      expect(s).toContain("https://wa.me/");
    }
    expect(e.text).toContain("Próxima cobrança: 04/11/2026");
  });

  it("welcome: prepaid shows validity instead of next charge", async () => {
    const e = await renderWelcomeEmail({ customerName: "João", contract: prepaid });
    expect(e.text).toContain("Válido até: 04/10/2027");
    expect(e.text).toContain("pago por 12 meses");
    expect(e.subject).toBe("Boas-vindas à Exactra, João");
  });

  it("internal notice escapes every customer field", async () => {
    const e = await renderNewContractNotice({
      customer: { name: evil, email: `x@y.com${evil}`, phone: "21999990000", document: evil },
      contract: { ...contract, id: "c1" },
      source: evil,
      adminUrl: "https://www.exactracontabilidade.com.br/admin/contrato?id=c1",
    });
    expectSafe(e);
    expect(e.html).toContain("/admin/contrato?id=c1");
  });

  it("password reset rejects non-http links", async () => {
    const ok = await renderPasswordResetEmail({ name: evil, url: "https://api.exactracontabilidade.com.br/reset?token=abc", expiresInMinutes: 60 });
    expectSafe(ok);
    expect(ok.text).toContain("https://api.exactracontabilidade.com.br/reset?token=abc");
    await expect(renderPasswordResetEmail({ name: "A", url: "javascript:alert(1)" })).rejects.toThrow(/Unsafe URL/);
  });

  it("2FA code is in subject, html and text", async () => {
    const e = await renderTwoFactorCodeEmail({ name: evil, code: "482913" });
    expectSafe(e);
    expect(e.subject).toContain("482913");
    expect(e.text).toContain("482913");
  });

  it("expiry reminder links to renewal", async () => {
    const e = await renderExpiryReminderEmail({ customerName: `Ana\r\nBcc: x@y.com`, contract: prepaid });
    expectSafe(e);
    expect(e.html).toContain("/checkout?plan=essencial");
    expect(e.subject).toContain("04/10/2027");
  });
});
