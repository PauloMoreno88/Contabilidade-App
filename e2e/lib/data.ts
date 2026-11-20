import fs from "node:fs";
import path from "node:path";
import { AUTH_DIR, FILES_DIR, RESULTS_DIR, RUN_ID } from "./env";

export const ADMIN_STATE = path.join(AUTH_DIR, "admin.json");
export const CUSTOMER_STATE = path.join(AUTH_DIR, "customer.json");

export const file = (name: string) => path.join(FILES_DIR, name);

/** A copy of a test file named after this run, so it is easy to tell apart from earlier runs. */
export function runFile(name: string): { path: string; name: string } {
  const copy = name.replace(/(\.\w+)$/, `-${RUN_ID}$1`);
  const target = path.join(RESULTS_DIR, copy);
  fs.copyFileSync(path.join(FILES_DIR, name), target);
  return { path: target, name: copy };
}

/** A valid CPF (check digits right), different on every call. */
export function cpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (base.every((d) => d === base[0])) base[0] = (base[0] + 1) % 10;
  const digit = (nums: number[]) => {
    const sum = nums.reduce((acc, n, i) => acc + n * (nums.length + 1 - i), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = digit(base);
  const d2 = digit([...base, d1]);
  return [...base, d1, d2].join("");
}

/** The month the documents screen opens on: the previous calendar month (YYYY-MM). */
export function documentsCompetence(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
