"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import { startOfToday } from "date-fns";
import { useLocale } from "next-intl";
import "react-day-picker/dist/style.css";

import { dateFnsLocaleForAppLocale } from "./dateFnsLocale";

export type RangeValue = {
  from?: Date;
  to?: Date;
};

type Props = {
  value: RangeValue;
  onChange: (value: RangeValue) => void;
  className?: string;
};

const MAX_DAYS = 29;

export function RangeCalendar({ value, onChange, className }: Props) {
  const appLocale = useLocale();
  const dateFnsLocale = useMemo(() => dateFnsLocaleForAppLocale(appLocale), [appLocale]);
  /** Keep Monday-first grid regardless of locale (matches previous behaviour + CH rental norm). */
  const weekStartsOn = 1;

  const [numberOfMonths, setNumberOfMonths] = useState(1);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 769px)");
    const apply = () => setNumberOfMonths(mql.matches ? 2 : 1);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  const today = startOfToday();

  // Only pass a selection if we actually have at least one date
  const selected: DateRange | undefined =
    value.from || value.to ? { from: value.from, to: value.to } : undefined;

  const isSunday = (d: Date) => d.getDay() === 0;

  return (
    <div className={className}>
      <DayPicker
        mode="range"
        numberOfMonths={numberOfMonths}
        locale={dateFnsLocale}
        weekStartsOn={weekStartsOn}
        selected={selected}
        /* keep the “Airbnb” style behaviour */
        onSelect={(next) => {
          if (!next) {
            onChange({ from: undefined, to: undefined });
            return;
          }
          const from = next.from ?? undefined;
          const to = next.to ?? undefined;
          // no pick-up on Sundays
          if (from && isSunday(from)) return;
          // no return on Sundays: keep the start, keep range "open"
          if (to && isSunday(to)) {
            onChange({ from, to: undefined });
            return;
          }
          onChange({ from, to });
        }}
        // if no start date yet → show current month
        defaultMonth={value.from ?? today}
        // don’t allow navigating to months before today
        fromMonth={today}
        pagedNavigation
        showOutsideDays
        // grey out and disable all past days
        disabled={{ before: today }}
        excludeDisabled
        max={MAX_DAYS}
      />
    </div>
  );
}
