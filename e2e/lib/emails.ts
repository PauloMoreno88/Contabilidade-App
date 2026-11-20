import fs from "node:fs";
import path from "node:path";
import { RESULTS_DIR } from "./env";

/**
 * The tests do not read mailboxes. Each step that should send an e-mail records it here;
 * `pnpm --filter e2e emails` prints the list so a person can check every inbox.
 */
export function expectEmail(flow: string, to: string, subject: string, note = "") {
  const line = JSON.stringify({ at: new Date().toISOString(), flow, to, subject, note });
  fs.appendFileSync(path.join(RESULTS_DIR, "emails.jsonl"), line + "\n");
}
