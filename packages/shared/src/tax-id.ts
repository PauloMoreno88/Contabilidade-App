// CPF and CNPJ check digits. CNPJs may be alphanumeric since July 2026 (12 letters or digits
// + 2 numeric check digits); each character counts as its ASCII code minus 48.

/** Keeps only letters and digits, upper case: "12.ABC.345/01DE-35" → "12ABC34501DE35". */
export const normalizeTaxId = (value: string) => value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();

const checkDigit = (chars: string, weights: number[]) => {
  const sum = [...chars].reduce((acc, ch, i) => acc + (ch.charCodeAt(0) - 48) * weights[i], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

export function isValidCpf(value: string): boolean {
  const d = normalizeTaxId(value);
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const w = (n: number) => Array.from({ length: n }, (_, i) => n + 1 - i);
  return checkDigit(d.slice(0, 9), w(9)) === Number(d[9]) && checkDigit(d.slice(0, 10), w(10)) === Number(d[10]);
}

export function isValidCnpj(value: string): boolean {
  const d = normalizeTaxId(value);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return checkDigit(d.slice(0, 12), w1) === Number(d[12]) && checkDigit(d.slice(0, 13), [6, ...w1]) === Number(d[13]);
}

export const isValidTaxId = (value: string) => isValidCpf(value) || isValidCnpj(value);
