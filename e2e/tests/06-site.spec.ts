import { devices, expect, test } from "@playwright/test";

// Fluxo 6: Site e conteúdo.
test.describe("Fluxo 6: Site e conteúdo", () => {
  test("menu, plano, contato e páginas legais", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#simulador")).toBeVisible();

    for (const [label, id] of [["Sobre nós", "sobre"], ["Serviços", "servicos"], ["Plano", "plano"], ["Contato", "contato"]] as const) {
      await page.getByRole("banner").getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }

    await expect(page.locator("#plano")).toContainText("Plano Exactra");
    await expect(page.locator("#plano")).toContainText(/anual/i);

    // No contact form: WhatsApp, phone and e-mail only.
    const contact = page.locator("#contato");
    await expect(contact.locator("form")).toHaveCount(0);
    await expect(contact.locator('a[href*="wa.me"]').first()).toBeVisible();
    await expect(contact.locator('a[href^="tel:+55"]')).toContainText(/\(\d{2}\)/);
    await expect(contact.locator('a[href^="mailto:"]')).toContainText(/@exactracontabilidade\.com\.br/);
    await expect(page.locator('a[href*="wa.me"][href*="text="]').first()).toBeAttached();

    // No photos of people: every image alt is about accounting, never a person.
    const alts = await page.locator("img").evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).alt.toLowerCase()));
    expect(alts.filter((a) => /pessoa|mulher|homem|equipe sorrindo|retrato/.test(a))).toEqual([]);

    await page.getByRole("contentinfo").getByRole("link", { name: "Política de privacidade" }).click();
    await expect(page).toHaveURL(/\/privacidade/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/termos");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("blog: filtro, artigo e convite para simular", async ({ page }) => {
    await page.goto("/blog");
    const filter = page.getByRole("group").filter({ has: page.getByRole("button", { name: "Impostos" }) });
    const cards = page.locator('main a[href^="/blog/"]');
    const all = await cards.count();
    await filter.getByRole("button", { name: "Impostos" }).click();
    await expect(filter.getByRole("button", { name: "Impostos" })).toHaveAttribute("aria-pressed", "true");
    const filtered = await cards.count();
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThanOrEqual(all);

    await cards.first().click();
    await expect(page).toHaveURL(/\/blog\/.+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("article img, main img").first()).toBeVisible();

    await page.getByRole("link", { name: /Fazer a simulação|Simular agora/ }).first().click();
    await expect(page).toHaveURL(/\/#simulador$/);
    await expect(page.locator("#simulador")).toBeVisible();
  });

  test("Acessar plataforma leva para /entrar (topo e rodapé)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: /Acessar plataforma/ }).click();
    await expect(page).toHaveURL(/\/entrar/);

    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Acessar plataforma" }).click();
    await expect(page).toHaveURL(/\/entrar/);
  });

  test("celular: menu abre e fecha, barra fixa embaixo", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["Pixel 7"], locale: "pt-BR" });
    const page = await context.newPage();
    await page.goto("/");
    await page.getByRole("button", { name: /menu/i }).click();
    await expect(page.getByRole("banner").getByRole("link", { name: "Blog" })).toBeVisible();
    await page.getByRole("button", { name: /fechar|menu/i }).click();
    await expect(page.getByRole("link", { name: "Simular grátis" })).toBeVisible();
    await context.close();
  });
});
