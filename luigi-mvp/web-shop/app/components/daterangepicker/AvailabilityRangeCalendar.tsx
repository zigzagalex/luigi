"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange, type OnSelectHandler } from "react-day-picker";
import { de } from "date-fns/locale";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfToday,
} from "date-fns";
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

const MAX_DAYS = 29; // whatever you chose earlier
const isSunday = (d: Date) => d.getDay() === 0;

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

  useEffect(() => {
    if (value.from) setMonth(value.from);
  }, [value.from]);

  const selected: DateRange | undefined =
    value.from || value.to ? { from: value.from, to: value.to } : undefined;

  const fromFetch = useMemo(() => startOfMonth(month), [month]);
  const toFetchInclusive = useMemo(() => endOfMonth(addMonths(month, 1)), [month]);
  const toFetchExclusive = useMemo(() => addDays(toFetchInclusive, 1), [toFetchInclusive]);

  useEffect(() => {
    if (!variantId || !storeId) return;

    const ac = new AbortController();

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
    const url = new URL("/v1/availability/calendar", API_BASE);
    url.searchParams.set("product_variant_id", String(variantId));
    url.searchParams.set("store_id", String(storeId));
    url.searchParams.set("from", iso(fromFetch));
    url.searchParams.set("to", iso(toFetchExclusive));
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
  }, [variantId, storeId, quantity, fromFetch, toFetchExclusive]);

  const unavailableDates = useMemo(
    () => days.filter((d) => d.available_quantity <= 0).map((d) => parseISO(d.date)),
    [days]
  );
  const availableDates = useMemo(
    () => days.filter((d) => d.available_quantity > 0).map((d) => parseISO(d.date)),
    [days]
  );

  const disabled = useMemo(
    () => [{ before: today }, ...unavailableDates],
    [today, unavailableDates]
  );

  const handleSelect: OnSelectHandler<DateRange | undefined> = (next, triggerDate) => {
    // If user clicks a Sunday, never allow it to become start or end.
    // We decide whether they're choosing start vs end based on current state.
    if (triggerDate && isSunday(triggerDate)) {
      // Choosing a new start (nothing selected yet OR range already completed)
      if (!value.from || value.to) return;

      // Choosing an end (start selected, end not yet)
      if (value.from && !value.to) {
        onChange({ from: value.from, to: undefined });
        return;
      }
    }

    // "same day twice" workaround — but don't allow Sunday same-day rentals
    if (!next) {
      if (value.from && !value.to && triggerDate && isSameDay(value.from, triggerDate)) {
        if (isSunday(triggerDate)) return;
        onChange({ from: triggerDate, to: triggerDate });
        return;
      }
      onChange({ from: undefined, to: undefined });
      return;
    }

    const from = next.from ?? undefined;
    const to = next.to ?? undefined;

    // Block Sunday start
    if (from && isSunday(from)) return;

    // Block Sunday end (keep the start and keep range open)
    if (to && isSunday(to)) {
      onChange({ from, to: undefined });
      return;
    }

    onChange({ from, to });
  };

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      <DayPicker
        mode="range"
        numberOfMonths={2}
        locale={de}
        selected={selected}
        onSelect={handleSelect}
        month={month}
        onMonthChange={setMonth}
        pagedNavigation
        weekStartsOn={1}
        fromMonth={today}
        showOutsideDays
        disabled={disabled}
        excludeDisabled
        modifiers={{ available: availableDates, unavailable: unavailableDates }}
        modifiersClassNames={{ available: styles.availableDay, unavailable: styles.unavailableDay }}
        max={MAX_DAYS} /* max dates in range in range mode */ 
      />
    </div>
  );
}