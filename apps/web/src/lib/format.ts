const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCents = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Whole reais, e.g. "R$ 1.240". */
export const formatBRL = (cents: number) => brl.format(Math.round(cents / 100));

/** With cents, e.g. "R$ 1.240,50". For totals the customer will pay. */
export const formatBRLExact = (cents: number) => brlCents.format(cents / 100);

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" });

/** "04/10/2026", or "—" for null. */
export const formatDate = (iso: string | null | undefined) => (iso ? date.format(new Date(iso)) : "—");
