/**
 * "Linha digitável" of Brazilian payment slips, as printed on tax guides.
 *
 * - Arrecadação (DAS, DARF, FGTS, GPS, most municipal taxes): 48 digits, starts with 8,
 *   4 blocks of 11 digits + check digit. The 3rd digit says which check (mod 10 or 11)
 *   applies and whether digits 5–15 of the barcode hold the amount.
 * - Boleto bancário (some municipal guides): 47 digits, 5 fields, amount in the last 10.
 *
 * Used to pre-fill and to check a guide before it is published: a line is only
 * accepted when every check digit matches (docs/plano.md, decision 25).
 */

export type BarcodeKind = "arrecadacao" | "boleto";

export interface BarcodeInfo {
  kind: BarcodeKind;
  /** Only the digits of the line (48 or 47). */
  line: string;
  /** The 44-digit barcode encoded by the line. */
  barcode: string;
  /** Every check digit matches. */
  valid: boolean;
  /** Amount encoded in the barcode, in cents. null when the slip carries no amount (reference value or zero). */
  amountCents: number | null;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

/** Mod 10 (weights 2,1 from the right, digits of each product summed). */
export function mod10(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    const p = Number(digits[i]) * weight;
    sum += p > 9 ? Math.floor(p / 10) + (p % 10) : p;
    weight = weight === 2 ? 1 : 2;
  }
  return (10 - (sum % 10)) % 10;
}

/** Mod 11 (weights 2..9 from the right). Returns the remainder-based digit; callers map the special cases. */
function mod11Raw(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += Number(digits[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  return 11 - (sum % 11);
}

/** Arrecadação: 10 and 11 become 0. */
export const mod11Arrecadacao = (digits: string) => {
  const dv = mod11Raw(digits);
  return dv >= 10 ? 0 : dv;
};

/** Boleto bancário general check digit: 0, 10 and 11 become 1. */
export const mod11Boleto = (digits: string) => {
  const dv = mod11Raw(digits);
  return dv === 0 || dv >= 10 ? 1 : dv;
};

function parseArrecadacao(line: string): BarcodeInfo {
  const blocks = [0, 1, 2, 3].map((i) => line.slice(i * 12, i * 12 + 12));
  const barcode = blocks.map((b) => b.slice(0, 11)).join("");
  const valueId = barcode[2];
  const check = valueId === "6" || valueId === "7" ? mod10 : valueId === "8" || valueId === "9" ? mod11Arrecadacao : null;
  const blocksOk = check !== null && blocks.every((b) => check(b.slice(0, 11)) === Number(b[11]));
  const generalOk = check !== null && check(barcode.slice(0, 3) + barcode.slice(4)) === Number(barcode[3]);
  // 6 and 8: digits 5–15 are the amount; 7 and 9: a reference quantity, not money.
  const amount = valueId === "6" || valueId === "8" ? Number(barcode.slice(4, 15)) : 0;
  return { kind: "arrecadacao", line, barcode, valid: blocksOk && generalOk, amountCents: amount > 0 ? amount : null };
}

function parseBoleto(line: string): BarcodeInfo {
  const f1 = line.slice(0, 10);
  const f2 = line.slice(10, 21);
  const f3 = line.slice(21, 32);
  const generalDv = line[32];
  const f5 = line.slice(33);
  const fieldsOk = [f1, f2, f3].every((f) => mod10(f.slice(0, -1)) === Number(f.at(-1)));
  const barcode = f1.slice(0, 4) + generalDv + f5 + f1.slice(4, 9) + f2.slice(0, 10) + f3.slice(0, 10);
  const generalOk = mod11Boleto(barcode.slice(0, 4) + barcode.slice(5)) === Number(generalDv);
  const amount = Number(f5.slice(4));
  return { kind: "boleto", line, barcode, valid: fieldsOk && generalOk, amountCents: amount > 0 ? amount : null };
}

/** Parses a typed or extracted line (spaces, dots and dashes are ignored). null when the length does not fit either kind. */
export function parseBarcodeLine(input: string): BarcodeInfo | null {
  const line = onlyDigits(input);
  if (line.length === 48 && line[0] === "8") return parseArrecadacao(line);
  if (line.length === 47) return parseBoleto(line);
  return null;
}

/** Printed format: "85800000001-2 34500328202-5 …" or "00190.00009 01234.567891 …". */
export function formatBarcodeLine(input: string): string {
  const line = onlyDigits(input);
  if (line.length === 48) return [0, 1, 2, 3].map((i) => `${line.slice(i * 12, i * 12 + 11)}-${line[i * 12 + 11]}`).join(" ");
  if (line.length === 47) {
    return [
      `${line.slice(0, 5)}.${line.slice(5, 10)}`,
      `${line.slice(10, 15)}.${line.slice(15, 21)}`,
      `${line.slice(21, 26)}.${line.slice(26, 32)}`,
      line[32],
      line.slice(33),
    ].join(" ");
  }
  return line;
}

/** Every valid line in a block of text (e.g. extracted from a PDF). */
export function findBarcodeLines(text: string): BarcodeInfo[] {
  const found = new Map<string, BarcodeInfo>();
  // Digit runs joined by spaces, dots or dashes, long enough to hold a whole line
  // (up to a few lines printed one after the other).
  for (const m of text.matchAll(/\d[\d .\-\n]{45,250}\d/g)) {
    const digits = onlyDigits(m[0]);
    for (const len of [48, 47]) {
      for (let i = 0; i + len <= digits.length; i++) {
        const info = parseBarcodeLine(digits.slice(i, i + len));
        if (info?.valid && !found.has(info.line)) found.set(info.line, info);
      }
    }
  }
  return [...found.values()];
}
