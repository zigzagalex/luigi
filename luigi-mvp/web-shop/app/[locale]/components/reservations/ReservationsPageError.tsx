"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import styles from "./ReservationsPageError.module.css";

export default function ReservationsPageError() {
  const router = useRouter();
  const t = useTranslations("reservationsPage");

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.retry}
        onClick={() => router.refresh()}
      >
        {t("retry")}
      </button>
      <Link href="/contact" className={styles.helpLink}>
        {t("getHelp")}
      </Link>
    </div>
  );
}
