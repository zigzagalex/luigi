import type { ApiAdminReservation } from "@/lib/reservationsApi";

export function formatLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatIsoAsLocalDateString(isoDateTime: string): string {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return isoDateTime.slice(0, 10);
  }
  return formatLocalDateString(parsed);
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
};

export function mapApiToMetrics(row: ApiAdminReservation): AdminReservationMetrics {
  return {
    storeId: row.store_id,
    status: row.status,
    pickupDate: formatIsoAsLocalDateString(row.start_at),
    returnDate: formatIsoAsLocalDateString(row.end_at),
  };
}
