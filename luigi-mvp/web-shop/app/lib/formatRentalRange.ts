import { formatRentalDay, inclusiveReturnInstant, intlLocaleTag } from "./rentalDates";

/**
 * Human-readable rental range, e.g. "23. März — 26. März".
 * Omits the year when the whole range falls in the current calendar year.
 * `endExclusiveIso` is the half-open exclusive end timestamp.
 */
export function formatRentalDateRange(
  startIso: string,
  endExclusiveIso: string,
  locale: string,
  now: Date = new Date()
): string {
  const start = new Date(startIso);
  const endInclusive = inclusiveReturnInstant(endExclusiveIso);
  if (Number.isNaN(start.getTime()) || !endInclusive || Number.isNaN(endInclusive.getTime())) {
    return "";
  }

  // Fallback to compact numeric if long format fails oddly
  const tag = intlLocaleTag(locale);
  const currentYear = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric" }).format(now),
  );

  const yearOf = (d: Date) =>
    Number(
      new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric" }).format(d),
    );

  const startYear = yearOf(start);
  const endYear = yearOf(endInclusive);

  const formatPart = (d: Date, withYear: boolean) =>
    new Intl.DateTimeFormat(tag, {
      timeZone: "Europe/Zurich",
      day: "numeric",
      month: "long",
      ...(withYear ? { year: "numeric" as const } : {}),
    }).format(d);

  let startStr: string;
  let endStr: string;

  if (startYear === endYear) {
    const showYear = startYear !== currentYear;
    startStr = formatPart(start, showYear);
    endStr = formatPart(endInclusive, showYear);
  } else {
    startStr = formatPart(start, true);
    endStr = formatPart(endInclusive, true);
  }

  if (!startStr || !endStr) {
    return `${formatRentalDay(startIso, locale)} — ${formatRentalDay(endExclusiveIso, locale, true)}`;
  }

  return `${startStr} — ${endStr}`;
}
