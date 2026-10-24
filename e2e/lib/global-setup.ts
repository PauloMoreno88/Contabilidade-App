import fs from "node:fs";
import path from "node:path";
import { RESULTS_DIR, RUN_ID } from "./env";

/** Starts a fresh list of expected e-mails for this run. */
export default function globalSetup() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(RESULTS_DIR, "emails.jsonl"), "");
  // Every worker reads the same id, so aliases match across files.
  process.env.E2E_RUN_ID = RUN_ID;
}
