"use client";

import Link from "next/link";
import { ReservationView } from "@/lib/reservationClient";
import { useLocale, useTranslations } from "next-intl";
import styles from "./ReservationRow.module.css";
import ReservationItemsPreview from "./ReservationItemsPreview";
import ReservationStatusBadge from "./ReservationStatusBadge";

type Props = {
  reservation: ReservationView;
};

export default function ReservationRow({ reservation }: Props) {
  const t = useTranslations("reservationRow");
  const locale = useLocale();
  const r = reservation.reservation;

  const formattedDate = new Date(r.created_at).toLocaleDateString(locale);
  const total = (r.total_price_cents / 100).toFixed(2);

  return (
    <Link href={`/reservations/${r.id}`} className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.number}>
            {t("reservationNumber", { id: String(r.id) })}
          </div>
          <div className={styles.date}>
            {formattedDate}
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.total}>
            CHF {total}
          </div>
          <ReservationStatusBadge
            status={r.status}
            cancelledAt={r.cancelled_at}
          />
        </div>
      </div>

      <ReservationItemsPreview items={reservation.items} />

      <div className={styles.range}>
        {new Date(r.start_at).toLocaleDateString(locale)} →{" "}
        {new Date(r.end_at).toLocaleDateString(locale)}
      </div>
    </Link>
  );
}
