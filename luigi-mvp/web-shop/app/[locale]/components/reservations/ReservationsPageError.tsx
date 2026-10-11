"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { localeHref } from "@/../i18n/localeHref";
import styles from "./ReservationsPageError.module.css";

export default function ReservationsPageError() {
  const router = useRouter();
  const locale = useLocale();
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
      <Link href={localeHref(locale, "/contact")} className={styles.helpLink}>
        {t("getHelp")}
      </Link>
    </div>
  );
}
