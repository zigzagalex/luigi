"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ReservationView } from "@/lib/reservationClient";
import { formatMoneyCents } from "@/lib/formatMoney";
import { isReservationCancelled } from "@/lib/reservationFilters";
import {
  getRentalRelativeTiming,
  isPickupDayLocal,
} from "@/lib/rentalRelativeTiming";
import { useLocale, useTranslations } from "next-intl";
import styles from "./ReservationRow.module.css";
import ReservationItemsPreview from "./ReservationItemsPreview";
import ReservationStatusBadge from "./ReservationStatusBadge";

type Props = {
  reservation: ReservationView;
};

export default function ReservationRow({ reservation }: Props) {
  const t = useTranslations("reservationRow");
  const tItems = useTranslations("reservationItemsFull");
  const locale = useLocale();
  const r = reservation.reservation;
  const items = reservation.items;

  const cancelled = isReservationCancelled(r);
  const createdLabel = new Date(r.created_at).toLocaleDateString(locale);
  const startLabel = new Date(r.start_at).toLocaleDateString(locale);
  const endLabel = new Date(r.end_at).toLocaleDateString(locale);
  const currency = r.currency || "CHF";
  const totalFormatted = formatMoneyCents(r.total_price_cents, locale, currency);

  const titleId = `reservation-card-title-${r.id}`;

  const heroTitle = useMemo(() => {
    const first = items[0];
    const name = first?.product_name?.trim();
    if (name) return name;
    return tItems("unnamedProduct");
  }, [items, tItems]);

  const relativeLabel = useMemo(() => {
    const rel = getRentalRelativeTiming(r.start_at, r.end_at, cancelled);
    if (!rel.kind) return null;
    switch (rel.kind) {
      case "ended":
        return t("rentalEnded");
      case "active":
        return t("rentalActive");
      case "startsToday":
        return t("startsToday");
      case "startsTomorrow":
        return t("startsTomorrow");
      case "startsInDays":
        return t("startsInDays", { days: rel.days ?? 0 });
      default:
        return null;
    }
  }, [r.start_at, r.end_at, cancelled, t]);

  const showPickup =
    !cancelled &&
    r.status === "confirmed" &&
    isPickupDayLocal(r.start_at, cancelled);

  const primaryLabel = showPickup ? t("pickup") : t("viewDetails");
  const primaryHref = `/reservations/${r.id}`;

  const showManageLinks = !cancelled;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.cardTop}>
        <div className={styles.cardTopMain}>
          <div className={styles.periodLabel}>{t("rentalPeriod")}</div>
          <div className={styles.periodDatesRow}>
            <div className={styles.periodDates}>
              <time dateTime={r.start_at}>{startLabel}</time>
              <span className={styles.visuallyHidden}>{t("dateRangeTo")}</span>
              <span aria-hidden="true" className={styles.rangeArrow}>
                {" "}
                →{" "}
              </span>
              <time dateTime={r.end_at}>{endLabel}</time>
            </div>
            {relativeLabel && (
              <span className={styles.relativeBadge}>{relativeLabel}</span>
            )}
          </div>
        </div>
        <ReservationStatusBadge
          status={r.status}
          cancelledAt={r.cancelled_at}
          emphasis="high"
          className={styles.statusCorner}
        />
      </div>

      <h2 id={titleId} className={styles.heroTitle}>
        {heroTitle}
      </h2>
      {items.length > 1 && (
        <p className={styles.heroMore}>
          {t("heroMoreItems", { count: items.length - 1 })}
        </p>
      )}

      <ReservationItemsPreview
        items={items}
        locale={locale}
        defaultCurrency={currency}
        hideNameAtIndex={items.length > 0 ? 0 : -1}
      />

      <div className={styles.bottom}>
        <div className={styles.bottomMeta}>
          <div className={styles.reservationIdMuted}>
            {t("reservationNumber", { id: String(r.id) })}
          </div>
          <div className={styles.placedOnMuted}>
            {t("placedOn", { date: createdLabel })}
          </div>
        </div>

        <div className={styles.bottomRight}>
          <div className={styles.total}>{totalFormatted}</div>
          <div className={styles.actions}>
            <Link href={primaryHref} className={styles.primaryCta}>
              {primaryLabel}
            </Link>
            {showManageLinks && (
              <div className={styles.secondaryLinks}>
                <Link href={primaryHref} className={styles.secondaryLink}>
                  {t("cancelLink")}
                </Link>
                <span className={styles.linkSep} aria-hidden>
                  ·
                </span>
                <Link
                  href={`/reservations/${r.id}/edit`}
                  className={styles.secondaryLink}
                >
                  {t("editLink")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
