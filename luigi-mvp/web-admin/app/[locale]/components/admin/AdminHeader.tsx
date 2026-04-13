"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import { useLocale } from "@/../i18n/useLocale";
import LocaleSwitcher from "@/[locale]/components/i18n/LocaleSwitcher";
import styles from "./AdminShell.module.css";

export function AdminHeader() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const { me, logout } = useAdminAuth();

  return (
    <header className={styles.bar}>
      <span className={styles.title}>{t("appTitle")}</span>
      <div className={styles.nav}>
        {me ? (
          <Link className={styles.navLink} href={`/${locale}/users`}>
            {t("navUsers")}
          </Link>
        ) : null}
        <LocaleSwitcher />
        {me ? (
          <button type="button" className={styles.logout} onClick={() => void logout()}>
            {t("logout")}
          </button>
        ) : null}
      </div>
    </header>
  );
}
