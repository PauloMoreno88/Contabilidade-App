import { describe, expect, it } from "vitest";
import {
  renderDocumentRejectedEmail,
  renderDocumentsOpenEmail,
  renderDocumentsReminderEmail,
  renderGuideDueEmail,
  renderGuidePublishedEmail,
  renderMagicLinkEmail,
  renderPortalInviteEmail,
  renderRetentionNoticeEmail,
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

  it("welcome: the annual card contract is prepaid, with no next charge", async () => {
    const e = await renderWelcomeEmail({ customerName: "Ana", contract: { ...prepaid, method: "CARD" } });
    expect(e.text).toContain("Cartão de crédito, 12 meses");
    expect(e.text).toContain("Válido até: 04/10/2027");
    expect(e.text).not.toContain("Próxima cobrança");
    expect(e.text).toContain("não renova sozinho");
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

describe("customer area e-mails", () => {
  const url = "https://www.exactracontabilidade.com.br/app/guias";
  const guide = { type: "DAS", competence: "2026-10", amountCents: 41250, dueDate: "2026-11-20" } as const;

  it("welcome carries the activation link when given", async () => {
    const e = await renderWelcomeEmail({ customerName: "Ana", contract: prepaid, activation: { url: "https://www.exactracontabilidade.com.br/entrar/ativar?token=abc", expiresInDays: 7 } });
    for (const s of [e.html, e.text]) expect(s).toContain("/entrar/ativar?token=abc");
    expect(e.text).toContain("Ativar meu acesso");
  });

  it("invite, magic link and notices escape data", async () => {
    const all = await Promise.all([
      renderPortalInviteEmail({ name: evil, companyName: evil, url: "https://x.com/entrar/ativar?token=1", expiresInDays: 7 }),
      renderMagicLinkEmail({ name: evil, url: "https://api.x.com/api/auth/magic-link/verify?token=1", expiresInMinutes: 15 }),
      renderGuidePublishedEmail({ customerName: evil, guide: { ...guide, label: evil }, url }),
      renderGuideDueEmail({ customerName: "Ana", guide, url, daysLeft: 0 }),
      renderDocumentsOpenEmail({ customerName: "Ana", competence: "2026-10", dueDate: "2026-11-10", items: [evil], url }),
      renderDocumentsReminderEmail({ customerName: "Ana", competence: "2026-10", dueDate: "2026-11-10", items: ["Extratos"], url, daysLeft: 1 }),
      renderDocumentRejectedEmail({ customerName: "Ana", competence: "2026-10", title: "Extratos", reason: "illegible", note: evil, url }),
      renderRetentionNoticeEmail({ customerName: "Ana", competence: "2025-10", deletesOn: "2026-11-01", url }),
    ]);
    all.forEach(expectSafe);
    await expect(renderMagicLinkEmail({ name: "A", url: "javascript:alert(1)", expiresInMinutes: 5 })).rejects.toThrow(/Unsafe URL/);
  });

  it("formats date-only values without shifting the day", async () => {
    const e = await renderGuidePublishedEmail({ customerName: "Ana", guide, url });
    expect(e.subject).toBe("Nova guia: DAS, vence em 20/11/2026");
    expect(e.text).toContain("Competência: outubro de 2026");
    expect(e.text).toMatch(/Valor: R\$\s412,50/);
    expect((await renderGuideDueEmail({ customerName: "Ana", guide, url, daysLeft: 0 })).subject).toBe("DAS vence hoje");
    const rem = await renderDocumentsReminderEmail({ customerName: "Ana", competence: "2026-10", dueDate: "2026-11-10", items: ["A", "B"], url, daysLeft: 3 });
    expect(rem.subject).toBe("Faltam 2 documentos de outubro de 2026");
  });
});
