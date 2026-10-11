"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { localeHref } from "@/../i18n/localeHref";
import type { ReservationView } from "@/lib/reservationClient";
import { formatMoneyCents, formatRentalDay } from "@/lib/rentalDates";
import styles from "./Confirmation.module.css";

const STORAGE_KEY = "luigi.checkout.reservations";

export default function CheckoutConfirmationPage() {
  const t = useTranslations("checkoutConfirmation");
  const locale = useLocale();
  const [reservations, setReservations] = useState<ReservationView[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ReservationView[];
      if (Array.isArray(parsed)) setReservations(parsed);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>✓</div>

        <h1 className={styles.title}>{t("title")}</h1>

        <p className={styles.subtitle}>{t("subtitle")}</p>

        {reservations.length > 0 ? (
          <ul className={styles.reservationList}>
            {reservations.map((view) => {
              const r = view.reservation;
              const first = view.items[0];
              const name = first?.product_name?.trim() || t("reservationFallback");
              const more = view.items.length > 1 ? view.items.length - 1 : 0;
              const currency = r.currency || "CHF";
              return (
                <li key={r.id} className={styles.reservationItem}>
                  <div className={styles.reservationId}>
                    {t("reservationNumber", { id: String(r.id) })}
                  </div>
                  <div className={styles.reservationName}>
                    {name}
                    {more > 0 ? ` ${t("moreItems", { count: more })}` : ""}
                  </div>
                  <div className={styles.reservationMeta}>
                    {formatRentalDay(r.start_at, locale)} → {formatRentalDay(r.end_at, locale, true)}
                  </div>
                  <div className={styles.reservationTotal}>
                    {formatMoneyCents(r.total_price_cents, locale, currency)}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className={styles.actions}>
          <Link href={localeHref(locale, "/reservations")} className={styles.primary}>
            {t("checkReservations")}
          </Link>

          <Link href={localeHref(locale, "/")} className={styles.secondary}>
            {t("continueShopping")}
          </Link>
        </div>
      </div>
    </div>
  );
}
