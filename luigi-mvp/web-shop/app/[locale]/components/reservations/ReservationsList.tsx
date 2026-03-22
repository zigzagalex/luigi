"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ReservationView } from "@/lib/reservationClient";
import {
  reservationMatchesFilter,
  type ReservationFilter,
} from "@/lib/reservationFilters";
import { useTranslations } from "next-intl";
import styles from "./ReservationsList.module.css";
import ReservationRow from "./ReservationRow";

type Props = {
  reservations: ReservationView[];
};

const FILTERS: ReservationFilter[] = [
  "all",
  "active",
  "past",
  "cancelled",
];

const FILTER_LABEL_KEY: Record<ReservationFilter, "filterAll" | "filterActive" | "filterPast" | "filterCancelled"> = {
  all: "filterAll",
  active: "filterActive",
  past: "filterPast",
  cancelled: "filterCancelled",
};

export default function ReservationsList({ reservations }: Props) {
  const t = useTranslations("reservationsList");
  const [filter, setFilter] = useState<ReservationFilter>("all");

  const filtered = useMemo(
    () => reservations.filter((r) => reservationMatchesFilter(r, filter)),
    [reservations, filter],
  );

  if (!reservations.length) {
    return (
      <div className={styles.emptyWrap}>
        <p className={styles.empty}>{t("empty")}</p>
        <p className={styles.emptyHint}>{t("emptyHint")}</p>
        <Link href="/" className={styles.browseCta}>
          {t("browseProducts")}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div
        className={styles.filters}
        role="group"
        aria-label={t("filterLabel")}
      >
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            className={`${styles.chip} ${filter === key ? styles.chipSelected : ""}`}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {t(FILTER_LABEL_KEY[key])}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <p className={styles.noMatches}>{t("noMatches")}</p>
      ) : (
        <div className={styles.list}>
          {filtered.map((r) => (
            <ReservationRow key={r.reservation.id} reservation={r} />
          ))}
        </div>
      )}
    </div>
  );
}
