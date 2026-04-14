"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "@/../i18n/useLocale";
import styles from "./AdminShell.module.css";

export function AdminSidebar() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const pathname = usePathname();

  const usersHref = `/${locale}/users`;
  const usersActive = pathname === usersHref || pathname.startsWith(`${usersHref}/`);

  return (
    <aside className={styles.sidebar} aria-label={t("appTitle")}>
      <nav className={styles.sidebarNav}>
        <p className={styles.navSection}>{t("navSectionMain")}</p>
        <ul className={styles.navList}>
          <li>
            <Link
              className={usersActive ? styles.navLinkActive : styles.navLink}
              href={usersHref}
            >
              {t("navUsers")}
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
