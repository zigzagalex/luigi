/** Shop rental dates are half-open [start, endExclusive) in Europe/Zurich. */

const ZURICH = "Europe/Zurich";

const LOCALE_TAGS: Record<string, string> = {
  en: "en-GB",
  de: "de-CH",
  fr: "fr-CH",
  it: "it-CH",
};

export function intlLocaleTag(appLocale: string): string {
  return LOCALE_TAGS[appLocale] ?? "de-CH";
}

function zurichYmd(iso: string): { y: number; m: number; d: number } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZURICH,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return { y, m, d };
}

/** Instant representing noon UTC on the inclusive return calendar day. */
export function inclusiveReturnInstant(endExclusiveIso: string): Date | null {
  const parts = zurichYmd(endExclusiveIso);
  if (!parts) return null;
  // Exclusive end is midnight of (return day + 1); inclusive return is prior Zurich day.
  const noonUtc = Date.UTC(parts.y, parts.m - 1, parts.d, 12, 0, 0);
  return new Date(noonUtc - 24 * 60 * 60 * 1000);
}

export function formatRentalDay(iso: string, appLocale: string, exclusiveEnd = false): string {
  const date = exclusiveEnd ? inclusiveReturnInstant(iso) : new Date(iso);
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(intlLocaleTag(appLocale), {
    timeZone: ZURICH,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Count inclusive rental days for a half-open [start, endExclusive) range. */
export function countRentalDays(startIso: string, endExclusiveIso: string): number {
  const from = zurichYmd(startIso);
  const toExclusive = zurichYmd(endExclusiveIso);
  if (!from || !toExclusive) return 1;
  const a = Date.UTC(from.y, from.m - 1, from.d);
  const b = Date.UTC(toExclusive.y, toExclusive.m - 1, toExclusive.d);
  const diff = Math.floor((b - a) / 86400000);
  return Math.max(1, diff);
}

export function formatMoneyCents(cents: number, appLocale: string, currency: string): string {
  return new Intl.NumberFormat(intlLocaleTag(appLocale), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
