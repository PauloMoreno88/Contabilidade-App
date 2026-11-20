import { expect, test } from "@playwright/test";

test("login shows pending feedback and releases the button on failure", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("admin@exactra.com.br");
  await page.getByLabel("Senha", { exact: true }).fill("senha-incorreta");
  const submit = page.getByRole("button", { name: "Entrar", exact: true });
  await submit.click();
  await expect(submit).toHaveAttribute("aria-busy", "true");
  await expect(submit).toBeDisabled();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(submit).toBeEnabled();
});

test("filters retain the table and announce refresh; async actions block repeated clicks", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("mock-session-user", "admin@exactra.com.br"));
  await page.goto("/admin/clientes");
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  await page.getByRole("searchbox").fill("Marina");
  await expect(page.getByRole("status").filter({ hasText: "Atualizando" })).toBeVisible();
  await expect(table).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Atualizando" })).toHaveCount(0);
  await page.goto("/admin/checklist");
  const action = page.getByRole("button", { name: "Desativar", exact: true }).first();
  await action.click();
  await expect(action).toHaveAttribute("aria-busy", "true");
  await expect(action).toBeDisabled();
  await expect(page.locator('button[aria-busy="true"]')).toHaveCount(0);
});

for (const width of [360, 768, 1280]) {
  test(`click feedback and reduced motion at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/entrar");
    const button = page.getByRole("button", { name: "Entrar", exact: true });
    await expect(button).toBeVisible();
    await expect(button).toHaveCSS("cursor", "pointer");
    const before = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
    await button.hover();
    await expect.poll(() => button.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before);
    await page.getByLabel("E-mail", { exact: true }).fill("admin@exactra.com.br");
    await page.getByLabel("Senha", { exact: true }).fill("invalida");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await button.click();
    await expect(button).toHaveCSS("cursor", "wait");
    expect(await button.evaluate((el) => getComputedStyle(el, "::before").animationName)).toBe("none");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
