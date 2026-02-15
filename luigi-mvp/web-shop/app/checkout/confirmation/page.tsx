"use client";

import Link from "next/link";
import styles from "./Confirmation.module.css";

export default function CheckoutConfirmationPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>✓</div>

        <h1 className={styles.title}>Reservation successful</h1>

        <p className={styles.subtitle}>
          Your reservation has been created successfully.
          You can view and manage it anytime in your account.
        </p>

        <div className={styles.actions}>
          <Link href="/reservations" className={styles.primary}>
            Check my reservations
          </Link>

          <Link href="/" className={styles.secondary}>
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
