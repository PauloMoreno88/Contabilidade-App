import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(here, "..", ".env"), quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in e2e/.env (see e2e/.env.example)`);
  return value;
}

export const BASE_URL = process.env.E2E_BASE_URL ?? "https://teste.exactracontabilidade.com.br";
export const API_URL = process.env.E2E_API_URL ?? "https://api.teste.exactracontabilidade.com.br";

export const ADMIN = { email: required("E2E_ADMIN_EMAIL"), password: required("E2E_ADMIN_PASSWORD") };
export const CUSTOMER = { email: required("E2E_CUSTOMER_EMAIL"), password: required("E2E_CUSTOMER_PASSWORD") };

/** New customers get "+e2e-…" aliases of this mailbox, so every e-mail lands somewhere the tester can read. */
export const ALIAS_MAILBOX = process.env.E2E_ALIAS_MAILBOX ?? ADMIN.email;

/** Where Exactra's internal notices go (ADMIN_NOTIFY_EMAIL on the API). */
export const TEAM_INBOX = process.env.E2E_TEAM_INBOX ?? "caixa interna da Exactra (ADMIN_NOTIFY_EMAIL do Render)";

export const ROOT = path.join(here, "..");
export const AUTH_DIR = path.join(ROOT, ".auth");
export const FILES_DIR = path.join(ROOT, "..", "docs", "test-files");
export const RESULTS_DIR = path.join(ROOT, "results");

/** One id per run, so names and e-mails created by the tests are easy to find. */
export const RUN_ID = process.env.E2E_RUN_ID ?? new Date().toISOString().slice(0, 19).replace(/\D/g, "");

export function alias(tag: string): string {
  const [user, domain] = ALIAS_MAILBOX.split("@");
  return `${user}+e2e-${tag}-${RUN_ID}@${domain}`;
}
