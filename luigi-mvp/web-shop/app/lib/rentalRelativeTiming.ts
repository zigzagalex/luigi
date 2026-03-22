export type RentalRelativeKind =
  | "ended"
  | "active"
  | "startsToday"
  | "startsTomorrow"
  | "startsInDays";

export type RentalRelativeResult =
  | { kind: null }
  | { kind: RentalRelativeKind; days?: number };

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function diffCalendarDays(fromDate: Date, toDate: Date): number {
  const a = startOfLocalDay(fromDate);
  const b = startOfLocalDay(toDate);
  return Math.round((b - a) / 86400000);
}

/** Relative rental timing for list cards (local calendar days). */
export function getRentalRelativeTiming(
  startAtIso: string,
  endAtIso: string,
  cancelled: boolean,
): RentalRelativeResult {
  if (cancelled) return { kind: null };

  const now = new Date();
  const start = new Date(startAtIso);
  const end = new Date(endAtIso);

  const todayTs = startOfLocalDay(now);
  const startTs = startOfLocalDay(start);
  const endTs = startOfLocalDay(end);

  if (endTs < todayTs) return { kind: "ended" };
  if (startTs > todayTs) {
    const days = diffCalendarDays(now, start);
    if (days === 1) return { kind: "startsTomorrow" };
    return { kind: "startsInDays", days };
  }
  if (startTs === todayTs) return { kind: "startsToday" };
  return { kind: "active" };
}

export function isPickupDayLocal(startAtIso: string, cancelled: boolean): boolean {
  if (cancelled) return false;
  const now = new Date();
  const start = new Date(startAtIso);
  return startOfLocalDay(now) === startOfLocalDay(start);
}
