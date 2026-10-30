import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`send and inspect recipient statuses at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const now = new Date().toISOString();
    const recipients = ["PENDING", "SENT", "DELIVERED", "FAILED", "SENT"].map((status, n) => ({
      id: `r${n}`, customerId: `c${n}`, name: `Empresa ${n}`, email: `cliente${n}@example.com`, status, updatedAt: now,
    }));
    const campaign = { id: "campaign", subject: "Aviso aos clientes", message: "Mensagem de teste\nSegunda linha", createdAt: now, createdBy: "admin@exactra.test", recipientCount: 4, recipients: recipients.filter((r) => r.customerId !== "c1") };
    await page.route("**/api/auth/get-session**", (route) => route.fulfill({ json: {
      user: { id: "admin", name: "Admin", email: "admin@exactra.test", role: "admin", twoFactorEnabled: true, emailVerified: true, createdAt: now, updatedAt: now },
      session: { id: "session", token: "test", userId: "admin", expiresAt: new Date(Date.now() + 3600000).toISOString(), createdAt: now, updatedAt: now },
    } }));
    await page.route("**/admin/emails**", async (route) => {
      if (route.request().resourceType() === "document") return route.continue();
      const url = new URL(route.request().url());
      if (route.request().method() === "POST") {
        expect(route.request().postDataJSON()).toMatchObject({ subject: campaign.subject, message: campaign.message, customerIds: ["c0", "c2", "c3", "c4"] });
        return route.fulfill({ json: { campaignId: campaign.id, sent: 3, failedCustomerIds: [] } });
      }
      if (url.pathname === "/admin/emails/recipients") return route.fulfill({ json: recipients.map((r) => ({ id: r.customerId, name: r.name, email: r.email })) });
      if (url.pathname === "/admin/emails/campaign") return route.fulfill({ json: campaign });
      if (url.pathname === "/admin/emails") return route.fulfill({ json: { items: [campaign], total: 1, page: 1, pageSize: 20 } });
      return route.continue();
    });
    await page.goto("/admin/emails");
    await expect(page.getByRole("checkbox")).toHaveCount(6);
    for (const box of await page.getByRole("checkbox").all()) await expect(box).toBeChecked();
    await page.getByLabel("Empresa 1", { exact: false }).uncheck();
    await page.getByLabel("Assunto", { exact: true }).fill(campaign.subject);
    await page.getByLabel("Mensagem", { exact: true }).fill(campaign.message);
    await page.getByRole("button", { name: "Enviar para 4 cliente(s)" }).click();
    await expect(page).toHaveURL(/\/admin\/emails\/envio\?id=campaign/);
    await expect(page.getByRole("heading", { name: campaign.subject })).toBeVisible();
    for (const label of ["Pendente", "Enviado", "Entregue", "Falhou"]) await expect(page.getByRole("cell", { name: label, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Atualizar status" }).click();
    await expect(page.getByRole("button", { name: "Atualizar status" })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`history-${width}.png`), fullPage: true });
    await page.getByRole("link", { name: "Voltar ao histórico" }).click();
    await page.getByRole("link", { name: /Aviso aos clientes/ }).click();
    await expect(page.getByRole("table")).toBeVisible();
  });
}
