import styles from "./page.module.css";

export default function ReservationDetailsPage({
  params,
}: {
  params: { reservationId: string };
}) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        Reservation {params.reservationId}
      </h1>

      <div className={styles.placeholder}>
        Reservation details page coming soon.
      </div>
    </div>
  );
}
