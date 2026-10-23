const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCents = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Whole reais, e.g. "R$ 1.240". */
export const formatBRL = (cents: number) => brl.format(Math.round(cents / 100));

/** With cents, e.g. "R$ 1.240,50". For totals the customer will pay. */
export const formatBRLExact = (cents: number) => brlCents.format(cents / 100);

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" });

/** "04/10/2026", or "—" for null. */
export const formatDate = (iso: string | null | undefined) => (iso ? date.format(new Date(iso)) : "—");

/** Date-only values from the API ("2026-11-20"): never shifted by the time zone. */
export const formatDay = (date: string) => {
  const [y, m, d] = date.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

const shortMonths = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "20 nov" for lists where the year is obvious. */
export const formatDayShort = (date: string) => {
  const [, m, d] = date.slice(0, 10).split("-");
  return `${Number(d)} ${shortMonths[Number(m) - 1]}`;
};

/** "1,2 MB", "830 KB". */
export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** "12.345.678/0001-90" or "123.456.789-09". */
export const formatDocument = (doc: string) => {
  const d = doc.replace(/\D/g, "");
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return doc;
};
