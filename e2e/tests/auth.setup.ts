import { expect, test as setup } from "@playwright/test";
import { ADMIN, CUSTOMER } from "../lib/env";
import { ADMIN_STATE, CUSTOMER_STATE } from "../lib/data";
import { signIn } from "../lib/pages";

setup("entra como equipe", async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password);
  await page.waitForURL(/\/admin/);
  await expect(page.getByRole("link", { name: "Clientes" })).toBeVisible();
  await page.context().storageState({ path: ADMIN_STATE });
});

setup("entra como cliente", async ({ page }) => {
  await signIn(page, CUSTOMER.email, CUSTOMER.password);
  await page.waitForURL(/\/app/);
  await expect(page.getByRole("link", { name: "Documentos" }).first()).toBeVisible();
  await page.context().storageState({ path: CUSTOMER_STATE });
});
