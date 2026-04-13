"use client";

import { useTranslations } from "next-intl";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import LocaleSwitcher from "@/[locale]/components/i18n/LocaleSwitcher";
import styles from "./AdminShell.module.css";

export function AdminTopBar() {
  const t = useTranslations("admin");
  const { me, logout } = useAdminAuth();

  return (
    <header className={styles.topBar}>
      <div className={styles.topBarLeft} aria-hidden />
      <div className={styles.topBarRight}>
        <LocaleSwitcher />
        {me ? (
          <button type="button" className={styles.logoutBtn} onClick={() => void logout()}>
            {t("logout")}
          </button>
        ) : null}
      </div>
    </header>
  );
}
