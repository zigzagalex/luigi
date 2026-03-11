"use client";

import { ReservationView } from "@/lib/reservationClient";
import { useTranslations } from "next-intl";
import styles from "./ReservationsList.module.css";
import ReservationRow from "./ReservationRow";

type Props = {
  reservations: ReservationView[];
};

export default function ReservationsList({ reservations }: Props) {
  const t = useTranslations("reservationsList");
  if (!reservations.length) {
    return (
      <div className={styles.empty}>
        {t("empty")}
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {reservations.map((r) => (
        <ReservationRow key={r.reservation.id} reservation={r} />
      ))}
    </div>
  );
}
