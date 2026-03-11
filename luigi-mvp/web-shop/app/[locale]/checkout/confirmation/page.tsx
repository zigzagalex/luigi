"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import styles from "./Confirmation.module.css";

export default function CheckoutConfirmationPage() {
  const t = useTranslations("checkoutConfirmation");
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>✓</div>

        <h1 className={styles.title}>{t("title")}</h1>

        <p className={styles.subtitle}>
          {t("subtitle")}
        </p>

        <div className={styles.actions}>
          <Link href="/reservations" className={styles.primary}>
            {t("checkReservations")}
          </Link>

          <Link href="/" className={styles.secondary}>
            {t("continueShopping")}
          </Link>
        </div>
      </div>
    </div>
  );
}
