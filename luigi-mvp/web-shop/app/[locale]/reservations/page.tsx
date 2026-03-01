import styles from "./page.module.css";
import ReservationsList from "../components/reservations/ReservationsList";
import { fetchApi } from "../../../utils/fetchAPI";
import type { ReservationView } from "@/lib/reservationClient";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

export default async function ReservationsPage() {
  try {
    const SHOP_ID = 1; 

    const cookieStore = cookies();
    const cookieHeader = (await cookieStore)
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await fetchApi(`/v1/reservations?shop_id=${SHOP_ID}`, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 404) {
        notFound();
      }

      const text = await res.text();
      console.error("Reservations fetch failed:", text);

      return (
        <div className={styles.container}>
          <h1 className={styles.title}>Your reservations</h1>
          <p>Failed to load reservations.</p>
        </div>
      );
    }

    const reservations = (await res.json()) as ReservationView[];

    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Your reservations</h1>
        <ReservationsList reservations={reservations} />
      </div>
    );
  } catch (e: any) {
    console.error("ReservationsPage crashed:", e);

    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Your reservations</h1>
        <p>Unexpected error occurred.</p>
      </div>
    );
  }
}
