"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { de } from "date-fns/locale";
import { addMonths, endOfMonth, format, parseISO, startOfMonth, startOfToday } from "date-fns";
import styles from "./AvailabilityRangeCalendar.module.css";

export type RangeValue = { from?: Date; to?: Date };
type CalendarDay = { date: string; available_quantity: number };

type Props = {
  variantId: number;
  storeId: number;
  quantity: number;
  value: RangeValue;
  onChange: (value: RangeValue) => void;
  className?: string;
};

function iso(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function AvailabilityRangeCalendar({
  variantId,
  storeId,
  quantity,
  value,
  onChange,
  className,
}: Props) {
  const today = startOfToday();
  const [month, setMonth] = useState<Date>(value.from ?? today);
  const [days, setDays] = useState<CalendarDay[]>([]);

  const selected: DateRange | undefined =
    value.from || value.to ? { from: value.from, to: value.to } : undefined;

  const fromFetch = useMemo(() => startOfMonth(month), [month]);
  const toFetch = useMemo(() => endOfMonth(addMonths(month, 1)), [month]);

  useEffect(() => {
    if (!variantId || !storeId) return;

    const ac = new AbortController();

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
    const url = new URL("/v1/availability/calendar", API_BASE);
    url.searchParams.set("product_variant_id", String(variantId));
    url.searchParams.set("store_id", String(storeId));
    url.searchParams.set("from", iso(fromFetch));
    url.searchParams.set("to", iso(toFetch));
    url.searchParams.set("quantity", String(quantity));

    fetch(url.toString(), { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return (await r.json()) as CalendarDay[];
      })
      .then(setDays)
      .catch((e) => {
        if (e.name !== "AbortError") console.error("calendar fetch failed:", e);
      });

    return () => ac.abort();
  }, [variantId, storeId, quantity, fromFetch, toFetch]);

  const unavailableDates = useMemo(
    () => days.filter((d) => d.available_quantity <= 0).map((d) => parseISO(d.date)),
    [days]
  );

  const availableDates = useMemo(
    () => days.filter((d) => d.available_quantity > 0).map((d) => parseISO(d.date)),
    [days]
  );

  const disabled = useMemo(() => [{ before: today }, ...unavailableDates], [today, unavailableDates]);

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      <DayPicker
        mode="range"
        numberOfMonths={2}
        locale={de}
        selected={selected}
        month={month}
        onMonthChange={setMonth}
        pagedNavigation
        weekStartsOn={1}
        startMonth={today}
        disabled={disabled}
        excludeDisabled
        modifiers={{ available: availableDates, unavailable: unavailableDates }}
        modifiersClassNames={{ available: styles.availableDay, unavailable: styles.unavailableDay }}
        onDayClick={(day, modifiers) => {
          if (modifiers.disabled) return;

          // Start new range if none started yet OR range already finished
          if (!value.from || value.to) {
            onChange({ from: day, to: undefined });
            return;
          }

          // Finish range (allow same-day!)
          const start = value.from;
          const end = day;

          if (end.getTime() < start.getTime()) {
            onChange({ from: end, to: start });
          } else {
            onChange({ from: start, to: end });
          }
        }}
      />
    </div>
  );
}
