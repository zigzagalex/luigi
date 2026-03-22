import type { ReservationView } from "@/lib/reservationClient";
import { isReservationCancelled } from "@/lib/reservationFilters";

/** Upcoming / in-progress first (by start date ascending), then ended or cancelled (most recent start first). */
export function sortReservationsForList(
  list: ReservationView[],
): ReservationView[] {
  const now = Date.now();
  return [...list].sort((a, b) => {
    const ra = a.reservation;
    const rb = b.reservation;
    const aCan = isReservationCancelled(ra);
    const bCan = isReservationCancelled(rb);
    const aEnded = new Date(ra.end_at).getTime() < now;
    const bEnded = new Date(rb.end_at).getTime() < now;
    const aLive = !aCan && !aEnded;
    const bLive = !bCan && !bEnded;
    if (aLive !== bLive) return aLive ? -1 : 1;
    if (aLive && bLive) {
      return (
        new Date(ra.start_at).getTime() - new Date(rb.start_at).getTime()
      );
    }
    return new Date(rb.start_at).getTime() - new Date(ra.start_at).getTime();
  });
}
