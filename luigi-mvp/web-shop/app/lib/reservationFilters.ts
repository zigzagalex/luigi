import type { Reservation, ReservationView } from "@/lib/reservationClient";

export type ReservationFilter = "all" | "active" | "past" | "cancelled";

export function isReservationCancelled(r: Reservation): boolean {
  if (r.status === "cancelled") return true;
  const ca = r.cancelled_at as string | null | { Valid?: boolean };
  if (ca && typeof ca === "object" && "Valid" in ca) {
    return Boolean((ca as { Valid: boolean }).Valid);
  }
  return ca != null && ca !== "";
}

export function reservationMatchesFilter(
  view: ReservationView,
  filter: ReservationFilter,
): boolean {
  if (filter === "all") return true;
  const r = view.reservation;
  const cancelled = isReservationCancelled(r);
  if (filter === "cancelled") return cancelled;
  if (cancelled) return false;
  const now = Date.now();
  const ended = new Date(r.end_at).getTime() < now;
  if (filter === "past") return ended;
  return !ended;
}
