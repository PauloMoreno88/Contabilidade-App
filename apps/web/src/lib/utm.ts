const KEYS = ["source", "medium", "campaign", "term", "content"] as const;
type Utm = Partial<Record<(typeof KEYS)[number], string>>;

/** utm_* params from the current URL, or undefined when there are none. */
export function readUtm(): Utm | undefined {
  const params = new URLSearchParams(window.location.search);
  const utm: Utm = {};
  for (const k of KEYS) {
    const v = params.get(`utm_${k}`);
    if (v) utm[k] = v;
  }
  return Object.keys(utm).length ? utm : undefined;
}
