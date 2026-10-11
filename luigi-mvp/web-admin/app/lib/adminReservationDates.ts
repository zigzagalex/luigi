import type { ApiAdminReservation } from "@/lib/reservationsApi";

const ZURICH = "Europe/Zurich";

export function formatLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function zurichYmdParts(isoDateTime: string): { y: number; m: number; d: number } | null {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZURICH,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return { y, m, d };
}

/** Pickup / start calendar day in Europe/Zurich. */
export function formatIsoAsLocalDateString(isoDateTime: string): string {
  const parts = zurichYmdParts(isoDateTime);
  if (!parts) return isoDateTime.slice(0, 10);
  return `${parts.y}-${String(parts.m).padStart(2, "0")}-${String(parts.d).padStart(2, "0")}`;
}

/**
 * Inclusive return calendar day for a half-open [start, endExclusive) rental.
 * Matches the shop's `formatRentalDay(..., exclusiveEnd=true)`.
 */
export function formatInclusiveReturnDateString(endExclusiveIso: string): string {
  const parts = zurichYmdParts(endExclusiveIso);
  if (!parts) return endExclusiveIso.slice(0, 10);
  const noonUtc = Date.UTC(parts.y, parts.m - 1, parts.d, 12, 0, 0);
  const inclusive = new Date(noonUtc - 24 * 60 * 60 * 1000);
  return formatLocalDateString(inclusive);
}

export function addLocalDaysToIsoDate(yyyyMmDd: string, days: number): string {
  const parts = yyyyMmDd.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined) return yyyyMmDd;
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatLocalDateString(date);
}

export function formatDisplayDateIso(yyyyMmDd: string, locale: string): string {
  const parts = yyyyMmDd.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined) return yyyyMmDd;
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

export type AdminReservationMetrics = {
  storeId: number;
  status: string;
  pickupDate: string;
  returnDate: string;
  totalPriceCents: number;
  currency: string;
};

export function mapApiToMetrics(row: ApiAdminReservation): AdminReservationMetrics {
  return {
    storeId: row.store_id,
    status: row.status,
    pickupDate: formatIsoAsLocalDateString(row.start_at),
    returnDate: formatInclusiveReturnDateString(row.end_at),
    totalPriceCents: row.total_price_cents ?? 0,
    currency: row.currency ?? "CHF",
  };
}
