import styles from "./page.module.css";
import ReservationsList from "../components/reservations/ReservationsList";
import ReservationsPageError from "../components/reservations/ReservationsPageError";
import { sortReservationsForList } from "@/lib/sortReservations";
import { fetchApi } from "../../../utils/fetchAPI";
import type { ReservationView } from "@/lib/reservationClient";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function ReservationsPage() {
  const t = await getTranslations("reservationsPage");
  try {
    const SHOP_ID = 1; 

    const cookieStore = await cookies();
    const cookieHeader = cookieStore
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
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.errorText}>{t("loadFailed")}</p>
          <ReservationsPageError />
        </div>
      );
    }

    const raw = (await res.json()) as ReservationView[];
    const reservations = sortReservationsForList(raw);

    return (
      <div className={styles.container}>
        <h1 className={styles.title}>{t("title")}</h1>
        <ReservationsList reservations={reservations} />
      </div>
    );
  } catch (e: any) {
    console.error("ReservationsPage crashed:", e);

    return (
      <div className={styles.container}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.errorText}>{t("unexpectedError")}</p>
        <ReservationsPageError />
      </div>
    );
  }
}
