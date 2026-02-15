"use client";

import { ReservationView } from "@/lib/reservationClient";
import styles from "./ReservationsList.module.css";
import ReservationRow from "./ReservationRow";

type Props = {
  reservations: ReservationView[];
};

export default function ReservationsList({ reservations }: Props) {
  if (!reservations.length) {
    return (
      <div className={styles.empty}>
        You don’t have any reservations yet.
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
