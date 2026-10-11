"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "@/../i18n/useLocale";
import styles from "./AdminShell.module.css";

export function AdminSidebar({
  open = false,
  onNavigate,
}: {
  open?: boolean;
  onNavigate?: () => void;
}) {
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
    <aside
      id="admin-sidebar"
      className={open ? `${styles.sidebar} ${styles.sidebarOpen}` : styles.sidebar}
      aria-label={t("appTitle")}
    >
      <nav className={styles.sidebarNav}>
        <p className={styles.navSection}>{t("navSectionMain")}</p>
        <ul className={styles.navList}>
          <li>
            <Link
              className={overviewActive ? styles.navLinkActive : styles.navLink}
              href={overviewHref}
              onClick={onNavigate}
            >
              {t("navOverview")}
            </Link>
          </li>
          <li>
            <Link
              className={usersActive ? styles.navLinkActive : styles.navLink}
              href={usersHref}
              onClick={onNavigate}
            >
              {t("navUsers")}
            </Link>
          </li>
          <li>
            <Link
              className={storesActive ? styles.navLinkActive : styles.navLink}
              href={storesHref}
              onClick={onNavigate}
            >
              {t("navStores")}
            </Link>
          </li>
          <li>
            <Link
              className={reservationsPrepareActive ? styles.navLinkActive : styles.navLink}
              href={reservationsPrepareHref}
              onClick={onNavigate}
            >
              {t("navReservationsPrepare")}
            </Link>
          </li>
          <li>
            <Link
              className={reservationsReadyActive ? styles.navLinkActive : styles.navLink}
              href={reservationsReadyHref}
              onClick={onNavigate}
            >
              {t("navReservationsReady")}
            </Link>
          </li>
          <li>
            <Link
              className={reservationsDropoffActive ? styles.navLinkActive : styles.navLink}
              href={reservationsDropoffHref}
              onClick={onNavigate}
            >
              {t("navReservationsDropoff")}
            </Link>
          </li>
          <li>
            <Link
              className={reservationsMaintenanceActive ? styles.navLinkActive : styles.navLink}
              href={reservationsMaintenanceHref}
              onClick={onNavigate}
            >
              {t("navReservationsMaintenance")}
            </Link>
          </li>
          <li>
            <Link
              className={findReservationActive ? styles.navLinkActive : styles.navLink}
              href={findReservationHref}
              onClick={onNavigate}
            >
              {t("navFindReservation")}
            </Link>
          </li>
          <li>
            <Link
              className={financialsActive ? styles.navLinkActive : styles.navLink}
              href={financialsHref}
              onClick={onNavigate}
            >
              {t("navFinancials")}
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
