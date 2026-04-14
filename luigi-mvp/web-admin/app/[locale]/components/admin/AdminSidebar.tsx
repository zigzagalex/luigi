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
  const storesHref = `/${locale}/users/stores`;
  const reservationsPrepareHref = `/${locale}/users/reservations/prepare`;
  const reservationsReadyHref = `/${locale}/users/reservations/ready`;
  const usersActive = pathname === usersHref;
  const storesActive = pathname === storesHref;
  const reservationsPrepareActive = pathname === reservationsPrepareHref;
  const reservationsReadyActive = pathname === reservationsReadyHref;

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
          <li>
            <Link
              className={storesActive ? styles.navLinkActive : styles.navLink}
              href={storesHref}
            >
              {t("navStores")}
            </Link>
          </li>
          <li>
            <Link
              className={reservationsPrepareActive ? styles.navLinkActive : styles.navLink}
              href={reservationsPrepareHref}
            >
              {t("navReservationsPrepare")}
            </Link>
          </li>
          <li>
            <Link
              className={reservationsReadyActive ? styles.navLinkActive : styles.navLink}
              href={reservationsReadyHref}
            >
              {t("navReservationsReady")}
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
