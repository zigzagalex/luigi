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
  const overviewHref = `/${locale}/users/overview`;
  const reservationsPrepareHref = `/${locale}/users/reservations/prepare`;
  const reservationsReadyHref = `/${locale}/users/reservations/ready`;
  const reservationsDropoffHref = `/${locale}/users/reservations/dropoff`;
  const reservationsMaintenanceHref = `/${locale}/users/reservations/maintenance`;
  const findReservationHref = `/${locale}/users/find-reservation`;
  const financialsHref = `/${locale}/users/financials`;
  const usersActive = pathname === usersHref;
  const storesActive = pathname === storesHref;
  const overviewActive = pathname === overviewHref;
  const reservationsPrepareActive = pathname === reservationsPrepareHref;
  const reservationsReadyActive = pathname === reservationsReadyHref;
  const reservationsDropoffActive = pathname === reservationsDropoffHref;
  const reservationsMaintenanceActive = pathname === reservationsMaintenanceHref;
  const findReservationActive = pathname === findReservationHref;
  const financialsActive = pathname === financialsHref;

  return (
    <aside className={styles.sidebar} aria-label={t("appTitle")}>
      <nav className={styles.sidebarNav}>
        <p className={styles.navSection}>{t("navSectionMain")}</p>
        <ul className={styles.navList}>
          <li>
            <Link
              className={overviewActive ? styles.navLinkActive : styles.navLink}
              href={overviewHref}
            >
              {t("navOverview")}
            </Link>
          </li>
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
          <li>
            <Link
              className={reservationsDropoffActive ? styles.navLinkActive : styles.navLink}
              href={reservationsDropoffHref}
            >
              {t("navReservationsDropoff")}
            </Link>
          </li>
          <li>
            <Link
              className={reservationsMaintenanceActive ? styles.navLinkActive : styles.navLink}
              href={reservationsMaintenanceHref}
            >
              {t("navReservationsMaintenance")}
            </Link>
          </li>
          <li>
            <Link
              className={findReservationActive ? styles.navLinkActive : styles.navLink}
              href={findReservationHref}
            >
              {t("navFindReservation")}
            </Link>
          </li>
          <li>
            <Link
              className={financialsActive ? styles.navLinkActive : styles.navLink}
              href={financialsHref}
            >
              {t("navFinancials")}
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
