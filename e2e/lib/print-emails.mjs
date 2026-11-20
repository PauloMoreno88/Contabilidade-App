// Prints the e-mails the last run should have sent, grouped by inbox (results/emails.jsonl).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "results", "emails.jsonl");
const rows = fs.existsSync(file)
  ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
  : [];
if (!rows.length) {
  console.log("Nenhum e-mail registrado. Rode os testes antes (pnpm --filter e2e staging).");
  process.exit(0);
}

const byInbox = Map.groupBy(rows, (r) => r.to);
for (const [inbox, list] of byInbox) {
  console.log(`\n${inbox}`);
  for (const r of list) {
    const at = new Date(r.at).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
    console.log(`  [${at}] ${r.subject}${r.note ? `  (${r.note})` : ""}  — ${r.flow}`);
  }
}
console.log(`\n${rows.length} e-mails esperados.`);
