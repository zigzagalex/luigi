// app/reservations/[reservationId]/edit/page.tsx
import styles from "./page.module.css";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { fetchApi } from "../../../../../utils/fetchAPI";
import type { ReservationView } from "@/lib/reservationClient";
import ReservationEditClient from "@/[locale]/components/reservations/ReservationEditClient";

export default async function ReservationEditPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const SHOP_ID = 1;

  const { reservationId } = await params;
  const reservationIdNum = Number(reservationId);
  if (!Number.isFinite(reservationIdNum)) notFound();

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await fetchApi(
      `/v1/reservations/${reservationIdNum}?shop_id=${SHOP_ID}`,
      {
        method: "GET",
        headers: { cookie: cookieHeader },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      if (res.status === 404) notFound();
      const text = await res.text();
      console.error("Reservation edit fetch failed:", text);

      return (
        <div className={styles.container}>
          <h1 className={styles.title}>Edit reservation</h1>
          <div className={styles.errorCard}>Failed to load this reservation.</div>
        </div>
      );
    }

    const reservation = (await res.json()) as ReservationView;

    return (
      <div className={styles.container}>
        <ReservationEditClient initialReservation={reservation} shopId={SHOP_ID} />
      </div>
    );
  } catch (e: any) {
    console.error("ReservationEditPage crashed:", e);

    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Edit reservation</h1>
        <div className={styles.errorCard}>Unexpected error occurred.</div>
      </div>
    );
  }
}