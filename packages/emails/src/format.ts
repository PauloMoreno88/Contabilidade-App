const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const day = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

export type DateInput = Date | string;

export const formatBRL = (cents: number) => brl.format(cents / 100);
export const formatDate = (d: DateInput) => day.format(typeof d === "string" ? new Date(d) : d);

/** First word of a full name, for greetings. */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name.trim();

/** Subjects end up in an e-mail header: no line breaks. */
export const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

/** Only http(s) links go into an href (blocks javascript: and data: URLs). */
export function safeUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error(`Unsafe URL protocol: ${parsed.protocol}`);
  return parsed.toString();
}

/** Base URL of the public site, where /email/logo.png lives. */
export function assetBaseUrl(): string {
  return (process.env.EMAIL_ASSET_BASE_URL || "https://www.exactracontabilidade.com.br").replace(/\/+$/, "");
}
