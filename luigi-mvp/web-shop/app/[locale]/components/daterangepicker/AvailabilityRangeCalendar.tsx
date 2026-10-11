"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange, type OnSelectHandler } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  addDays,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfToday,
} from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import styles from "./AvailabilityRangeCalendar.module.css";
import { dateFnsLocaleForAppLocale } from "./dateFnsLocale";
import { apiBase } from "@/lib/apiBase";

export type RangeValue = { from?: Date; to?: Date };
type CalendarDay = { date: string; available_quantity: number };

type Props = {
  variantId: number;
  storeId: number;
  quantity: number;
  holidays: Array<{ start_date: string; end_date: string; note?: string | null }>;
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
  holidays,
  value,
  onChange,
  className,
}: Props) {
  const appLocale = useLocale();
  const t = useTranslations("productDetail");
  const dateFnsLocale = useMemo(() => dateFnsLocaleForAppLocale(appLocale), [appLocale]);
  const weekStartsOn = dateFnsLocale.options?.weekStartsOn ?? 1;

  const today = startOfToday();
  const [month, setMonth] = useState<Date>(value.from ?? today);
  const [days, setDays] = useState<CalendarDay[]>([]);

  useEffect(() => {
    if (value.from) setMonth(value.from);
  }, [value.from]);

  const selected: DateRange | undefined =
    value.from || value.to ? { from: value.from, to: value.to } : undefined;

  const fromFetch = useMemo(() => startOfMonth(month), [month]);
  const toFetchInclusive = useMemo(() => endOfMonth(month), [month]);
  const toFetchExclusive = useMemo(() => addDays(toFetchInclusive, 1), [toFetchInclusive]);

  useEffect(() => {
    if (!variantId || !storeId) return;

    const ac = new AbortController();

    const url = new URL("/v1/availability/calendar", apiBase() || window.location.origin);
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
  const holidayDates = useMemo(() => {
    const out: Date[] = [];
    for (const holiday of holidays) {
      const start = parseISO(holiday.start_date);
      const end = parseISO(holiday.end_date);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
      let cursor = start;
      while (cursor.getTime() <= end.getTime()) {
        out.push(cursor);
        cursor = addDays(cursor, 1);
      }
    }
    return out;
  }, [holidays]);
  const isHolidayDate = useCallback(
    (d: Date) => holidayDates.some((holidayDate) => isSameDay(holidayDate, d)),
    [holidayDates],
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
    if (triggerDate && isHolidayDate(triggerDate)) {
      if (!value.from || value.to) return;
      if (value.from && !value.to) {
        onChange({ from: value.from, to: undefined });
        return;
      }
    }

    // "same day twice" workaround — but don't allow Sunday same-day rentals
    if (!next) {
      if (value.from && !value.to && triggerDate && isSameDay(value.from, triggerDate)) {
        if (isSunday(triggerDate) || isHolidayDate(triggerDate)) return;
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
    if (from && isHolidayDate(from)) return;

    // Block Sunday end (keep the start and keep range open)
    if (to && isSunday(to)) {
      onChange({ from, to: undefined });
      return;
    }
    if (to && isHolidayDate(to)) {
      onChange({ from, to: undefined });
      return;
    }

    onChange({ from, to });
  };

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      <div className={styles.legend} role="list" aria-label={t("calendarLegendAria")}>
        <span className={styles.legendItem} role="listitem">
          <span className={`${styles.legendSwatch} ${styles.legendSwatchAvailable}`} aria-hidden />
          <span>{t("calendarLegendAvailable")}</span>
        </span>
        <span className={styles.legendSep} aria-hidden>
          ·
        </span>
        <span className={styles.legendItem} role="listitem">
          <span className={`${styles.legendSwatch} ${styles.legendSwatchSelected}`} aria-hidden />
          <span>{t("calendarLegendSelected")}</span>
        </span>
        <span className={styles.legendSep} aria-hidden>
          ·
        </span>
        <span className={styles.legendItem} role="listitem">
          <span className={`${styles.legendSwatch} ${styles.legendSwatchHoliday}`} aria-hidden />
          <span>{t("calendarLegendHoliday")}</span>
        </span>
        <span className={styles.legendSep} aria-hidden>
          ·
        </span>
        <span className={styles.legendItem} role="listitem">
          <span className={`${styles.legendSwatch} ${styles.legendSwatchToday}`} aria-hidden />
          <span>{t("calendarLegendToday")}</span>
        </span>
      </div>
      <DayPicker
        mode="range"
        numberOfMonths={1}
        locale={dateFnsLocale}
        selected={selected}
        onSelect={handleSelect}
        month={month}
        onMonthChange={setMonth}
        pagedNavigation
        weekStartsOn={weekStartsOn}
        fromMonth={today}
        showOutsideDays
        disabled={disabled}
        excludeDisabled
        modifiers={{ available: availableDates, unavailable: unavailableDates, holiday: holidayDates }}
        modifiersClassNames={{ available: styles.availableDay, unavailable: styles.unavailableDay, holiday: styles.holidayDay }}
        max={MAX_DAYS} /* max dates in range in range mode */
      />
    </div>
  );
}