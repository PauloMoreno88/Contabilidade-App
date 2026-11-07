import { expect, test } from "@playwright/test";

for (const role of ["admin", "customer"] as const) {
  for (const width of [360, 1280]) {
    test(`${role} workspace navigation at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const now = new Date().toISOString();
      const user = { id: role, name: role === "admin" ? "Admin Exactra" : "Marina Costa", email: `${role}@exactra.test`, role, emailVerified: true, twoFactorEnabled: true, createdAt: now, updatedAt: now };
      await page.route("**/api/auth/get-session**", (route) => route.fulfill({ json: { user, session: { id: "session", token: "test", userId: role, expiresAt: new Date(Date.now() + 3600000).toISOString(), createdAt: now, updatedAt: now } } }));
      await page.route("**/app/me", (route) => route.fulfill({ json: {
        user, company: { id: "company", name: "Estúdio Marina Costa", document: "12345678000190", email: user.email, phone: "11999999999" },
        access: { level: "FULL", endsAt: null, readOnlyUntil: null }, onboarded: true,
      } }));
      await page.route("**/app/home", (route) => route.fulfill({ json: {
        tasks: [{ kind: "documents", competence: "2026-10", pending: 2, total: 4, dueDate: "2026-11-05" }],
        documents: { competence: "2026-10", sent: 2, total: 4, dueDate: "2026-11-05" },
        guides: { open: 0, openAmountCents: 0, nextDueDate: null }, recentGuides: [],
      } }));
      const path = role === "admin" ? "/admin/seguranca" : "/app";
      await page.goto(path);
      const area = role === "admin" ? "Painel administrativo" : "Área do cliente";
      await expect(page.getByRole("main")).toBeVisible();
      const nav = width < 1024 ? page.getByRole("dialog", { name: area }) : page.getByRole("navigation", { name: area });
      if (width < 1024) {
        const open = page.getByRole("button", { name: "Abrir menu" });
        await open.click();
        await expect(nav).toBeVisible();
        await expect(nav.getByRole("link", { name: role === "admin" ? "Segurança" : "Início", exact: true })).toHaveAttribute("aria-current", "page");
        await page.screenshot({ path: test.info().outputPath(`${role}-menu-${width}.png`), fullPage: true });
        await page.keyboard.press("Escape");
        await expect(nav).not.toBeVisible();
        await expect(open).toBeFocused();
        await open.click();
        await nav.getByRole("link", { name: role === "admin" ? "Segurança" : "Início", exact: true }).click();
        await expect(nav).not.toBeVisible();
      } else {
        await page.getByRole("button", { name: "Recolher menu" }).click();
        await expect(page.getByRole("button", { name: "Expandir menu" })).toBeVisible();
        await expect(page.locator("aside")).toHaveCSS("width", "80px");
        await expect(nav.getByRole("link", { name: role === "admin" ? "Segurança" : "Início", exact: true })).toHaveAttribute("aria-current", "page");
        await page.getByRole("button", { name: "Expandir menu" }).click();
        await expect(page.locator("aside")).toHaveCSS("width", "256px");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`${role}-${width}.png`), fullPage: true });
      if (role === "customer") {
        await expect(page.getByRole("link", { name: "Contratos", exact: true })).toHaveCount(0);
        await expect(page.getByRole("link", { name: "E-mails", exact: true })).toHaveCount(0);
      }
    });
  }
}
