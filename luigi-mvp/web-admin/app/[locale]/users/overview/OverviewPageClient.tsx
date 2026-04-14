"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "@/../i18n/useLocale";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import { useAdminStore } from "@/[locale]/components/admin/AdminStoreContext";
import { mapApiToMetrics, formatLocalDateString, type AdminReservationMetrics } from "@/lib/adminReservationDates";
import { SHOP_ID } from "@/lib/AuthSession";
import { listAdminReservations, type ApiAdminReservation } from "@/lib/reservationsApi";
import styles from "./overview.module.css";

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function addLocalDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function filterByStore(rows: AdminReservationMetrics[], storeId: number | null): AdminReservationMetrics[] {
  if (storeId === null) return rows;
  return rows.filter((r) => r.storeId === storeId);
}

export function OverviewPageClient() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const { me, loading: authLoading } = useAdminAuth();
  const { selectedStoreId, stores } = useAdminStore();
  const [rows, setRows] = useState<AdminReservationMetrics[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const todayStr = formatLocalDateString(new Date());

  const weekStart = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return startOfWeekMonday(base);
  }, [weekOffset]);

  const weekDayKeys = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => formatLocalDateString(addLocalDays(weekStart, i)));
  }, [weekStart]);

  const weekRangeLabel = useMemo(() => {
    const start = weekDayKeys[0];
    const end = weekDayKeys[6];
    if (!start || !end) return "";
    const a = new Date(start + "T12:00:00");
    const b = new Date(end + "T12:00:00");
    const fmt = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
    const y = new Intl.DateTimeFormat(locale, { year: "numeric" }).format(a);
    return `${fmt.format(a)} – ${fmt.format(b)}, ${y}`;
  }, [weekDayKeys, locale]);

  const scoped = useMemo(() => filterByStore(rows, selectedStoreId), [rows, selectedStoreId]);

  const storeLabel = useMemo(() => {
    if (selectedStoreId === null) return t("overviewStoreAll");
    const city = stores.find((s) => s.id === selectedStoreId)?.city;
    return city ?? t("overviewStoreAll");
  }, [selectedStoreId, stores, t]);

  const todayCounts = useMemo(() => {
    const r = scoped;
    const prepare = r.filter((x) => x.status === "confirmed" && x.pickupDate === todayStr).length;
    const readyPickup = r.filter((x) => x.status === "out_for_pickup" && x.pickupDate === todayStr).length;
    const returnDue = r.filter((x) => x.status === "in_use" && x.returnDate === todayStr).length;
    const droppedOff = r.filter((x) => x.status === "returned" && x.returnDate === todayStr).length;
    const maintenanceBacklog = r.filter((x) => x.status === "returned").length;
    const overduePickup = r.filter((x) => x.status === "out_for_pickup" && x.pickupDate < todayStr).length;
    const overdueDropoff = r.filter((x) => x.status === "in_use" && x.returnDate < todayStr).length;
    return {
      prepare,
      readyPickup,
      returnDue,
      droppedOff,
      maintenanceBacklog,
      overduePickup,
      overdueDropoff,
    };
  }, [scoped, todayStr]);

  const weekRows = useMemo(() => {
    const metrics = [
      {
        key: "prepare",
        label: t("overviewWeekRowPrepare"),
        getCount: (day: string) =>
          scoped.filter((x) => x.status === "confirmed" && x.pickupDate === day).length,
      },
      {
        key: "ready",
        label: t("overviewWeekRowReady"),
        getCount: (day: string) =>
          scoped.filter((x) => x.status === "out_for_pickup" && x.pickupDate === day).length,
      },
      {
        key: "returnDue",
        label: t("overviewWeekRowReturnDue"),
        getCount: (day: string) =>
          scoped.filter((x) => x.status === "in_use" && x.returnDate === day).length,
      },
      {
        key: "returned",
        label: t("overviewWeekRowReturned"),
        getCount: (day: string) =>
          scoped.filter((x) => x.status === "returned" && x.returnDate === day).length,
      },
    ] as const;

    return metrics.map((row) => {
      const counts = weekDayKeys.map((d) => row.getCount(d));
      const max = Math.max(1, ...counts);
      return { ...row, counts, max };
    });
  }, [scoped, weekDayKeys, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!me) {
      router.replace(`/${locale}/login?next=/${locale}/users/overview`);
    }
  }, [authLoading, me, locale, router]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    (async () => {
      try {
        const [confirmedRows, readyRows, inUseRows, returnedRows] = await Promise.all([
          listAdminReservations(SHOP_ID, "confirmed"),
          listAdminReservations(SHOP_ID, "out_for_pickup"),
          listAdminReservations(SHOP_ID, "in_use"),
          listAdminReservations(SHOP_ID, "returned"),
        ]);
        if (cancelled) return;
        const all: ApiAdminReservation[] = [...confirmedRows, ...readyRows, ...inUseRows, ...returnedRows];
        setRows(all.map(mapApiToMetrics));
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Could not load data.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me]);

  if (authLoading || !me) {
    return (
      <main className={styles.main}>
        <p className={styles.muted}>…</p>
      </main>
    );
  }

  const prepareHref = `/${locale}/users/reservations/prepare`;
  const readyHref = `/${locale}/users/reservations/ready`;
  const dropoffHref = `/${locale}/users/reservations/dropoff`;
  const maintenanceHref = `/${locale}/users/reservations/maintenance`;

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.h1}>{t("overviewTitle")}</h1>
        <p className={styles.sub}>{t("overviewSubtitle")}</p>
        <p className={styles.storeHint}>
          <strong>{t("overviewStoreScope")}</strong> {storeLabel}
        </p>
      </div>

      {loadError ? (
        <p className={styles.error} role="alert">
          {loadError}
        </p>
      ) : null}

      <section className={styles.section} aria-labelledby="overview-today">
        <h2 id="overview-today" className={styles.sectionTitle}>
          {t("overviewTodaySection")}
        </h2>
        <p className={styles.sectionLead}>{t("overviewTodayLead")}</p>
        <div className={styles.todayGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t("overviewStatPrepare")}</span>
            <span className={styles.statValue}>{todayCounts.prepare}</span>
            <Link className={styles.statLink} href={prepareHref}>
              {t("overviewGoToPrepare")}
            </Link>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t("overviewStatReadyPickup")}</span>
            <span className={styles.statValue}>{todayCounts.readyPickup}</span>
            <Link className={styles.statLink} href={readyHref}>
              {t("overviewGoToReady")}
            </Link>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t("overviewStatReturnDue")}</span>
            <span className={styles.statValue}>{todayCounts.returnDue}</span>
            <Link className={styles.statLink} href={dropoffHref}>
              {t("overviewGoToDropoff")}
            </Link>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t("overviewStatDroppedOff")}</span>
            <span className={styles.statValue}>{todayCounts.droppedOff}</span>
            <Link className={styles.statLink} href={maintenanceHref}>
              {t("overviewGoToMaintenance")}
            </Link>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t("overviewStatMaintenanceBacklog")}</span>
            <span className={styles.statValue}>{todayCounts.maintenanceBacklog}</span>
            <Link className={styles.statLink} href={maintenanceHref}>
              {t("overviewGoToMaintenance")}
            </Link>
          </div>
          <div className={`${styles.statCard} ${styles.statCardAlert}`}>
            <span className={styles.statLabel}>{t("overviewStatOverduePickup")}</span>
            <span className={styles.statValue}>{todayCounts.overduePickup}</span>
            <Link className={styles.statLink} href={readyHref}>
              {t("overviewGoToReady")}
            </Link>
          </div>
          <div className={`${styles.statCard} ${styles.statCardAlert}`}>
            <span className={styles.statLabel}>{t("overviewStatOverdueDropoff")}</span>
            <span className={styles.statValue}>{todayCounts.overdueDropoff}</span>
            <Link className={styles.statLink} href={dropoffHref}>
              {t("overviewGoToDropoff")}
            </Link>
          </div>
        </div>
        <p className={styles.limitNote}>{t("overviewDataLimitNote")}</p>
      </section>

      <section className={styles.section} aria-labelledby="overview-week">
        <h2 id="overview-week" className={styles.sectionTitle}>
          {t("overviewWeekSection")}
        </h2>
        <p className={styles.sectionLead}>{t("overviewWeekLead")}</p>
        <div className={styles.weekToolbar}>
          <button type="button" className={styles.weekBtn} onClick={() => setWeekOffset((o) => o - 1)}>
            {t("overviewWeekPrev")}
          </button>
          <span className={styles.weekRange}>{weekRangeLabel}</span>
          <button type="button" className={styles.weekBtn} onClick={() => setWeekOffset((o) => o + 1)}>
            {t("overviewWeekNext")}
          </button>
          {weekOffset !== 0 ? (
            <button type="button" className={styles.weekBtn} onClick={() => setWeekOffset(0)}>
              {t("overviewWeekThis")}
            </button>
          ) : null}
        </div>
        <div className={styles.weekTableWrap}>
          <table className={styles.weekTable}>
            <thead>
              <tr>
                <th scope="col">{t("overviewWeekColMetric")}</th>
                {weekDayKeys.map((d) => {
                  const short = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(d + "T12:00:00"));
                  const isToday = d === todayStr;
                  return (
                    <th key={d} scope="col" className={isToday ? styles.todayCol : undefined}>
                      <span>{short}</span>
                      <br />
                      <span>{d.slice(5)}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {weekRows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  {row.counts.map((c, i) => {
                    const d = weekDayKeys[i];
                    const isToday = d === todayStr;
                    return (
                      <td key={`${row.key}-${d}`} className={isToday ? styles.todayCol : undefined}>
                        <div className={styles.barCell}>
                          <div
                            className={styles.barFill}
                            style={{
                              height: c === 0 ? "4px" : `${Math.max(8, (c / row.max) * 44)}px`,
                            }}
                          />
                          <span className={styles.barValue}>{c}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
