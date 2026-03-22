/**
 * Human-readable rental range, e.g. "23. März — 26. März".
 * Omits the year when the whole range falls in the current calendar year.
 */
export function formatRentalDateRange(
  startIso: string,
  endIso: string,
  locale: string,
  now: Date = new Date()
): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  const currentYear = now.getFullYear();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  const formatPart = (d: Date, withYear: boolean) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      ...(withYear ? { year: "numeric" as const } : {}),
    }).format(d);

  let startStr: string;
  let endStr: string;

  if (startYear === endYear) {
    const showYear = startYear !== currentYear;
    startStr = formatPart(start, showYear);
    endStr = formatPart(end, showYear);
  } else {
    startStr = formatPart(start, true);
    endStr = formatPart(end, true);
  }

  return `${startStr} — ${endStr}`;
}
