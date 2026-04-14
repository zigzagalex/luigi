"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "@/../i18n/useLocale";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import { useAdminStore } from "@/[locale]/components/admin/AdminStoreContext";
import { formatLocalDateString, mapApiToMetrics, type AdminReservationMetrics } from "@/lib/adminReservationDates";
import { SHOP_ID } from "@/lib/AuthSession";
import { listAdminReservations, type ApiAdminReservation } from "@/lib/reservationsApi";
import styles from "./financials.module.css";

function formatMoney(cents: number, locale: string, currency = "CHF"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const esc = (v: string) => `"${v.replaceAll("\"", "\"\"")}"`;
  const content = [header.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function FinancialsPageClient() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const { me, loading } = useAdminAuth();
  const { selectedStoreId, stores } = useAdminStore();
  const [rows, setRows] = useState<AdminReservationMetrics[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(() =>
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
  );

  useEffect(() => {
    if (loading) return;
    if (!me) router.replace(`/${locale}/login?next=/${locale}/users/financials`);
  }, [loading, me, locale, router]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    (async () => {
      try {
        const closedRows = await listAdminReservations(SHOP_ID, "closed");
        if (cancelled) return;
        setRows((closedRows as ApiAdminReservation[]).map(mapApiToMetrics));
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Could not load financials.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me]);

  const scoped = useMemo(() => {
    if (selectedStoreId === null) return rows;
    return rows.filter((r) => r.storeId === selectedStoreId);
  }, [rows, selectedStoreId]);

  const storeLabel = useMemo(() => {
    if (selectedStoreId === null) return t("overviewStoreAll");
    return stores.find((s) => s.id === selectedStoreId)?.city ?? t("overviewStoreAll");
  }, [selectedStoreId, stores, t]);

  const monthKeys = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`),
    [year],
  );

  const yearMonthly = useMemo(() => {
    return monthKeys.map((key) => {
      const cents = scoped
        .filter((r) => r.status === "closed" && r.returnDate.slice(0, 7) === key)
        .reduce((sum, r) => sum + r.totalPriceCents, 0);
      return { key, cents };
    });
  }, [scoped, monthKeys]);

  const selectedMonthDays = useMemo(() => {
    const [yStr, mStr] = month.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    if (!y || !m) return [] as Array<{ key: string; cents: number }>;
    const days = new Date(y, m, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = `${y}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      const cents = scoped
        .filter((r) => r.status === "closed" && r.returnDate === d)
        .reduce((sum, r) => sum + r.totalPriceCents, 0);
      return { key: d, cents };
    });
  }, [scoped, month]);

  const maxYear = Math.max(1, ...yearMonthly.map((x) => x.cents));
  const maxMonth = Math.max(1, ...selectedMonthDays.map((x) => x.cents));
  const totalYear = yearMonthly.reduce((sum, x) => sum + x.cents, 0);
  const totalMonth = selectedMonthDays.reduce((sum, x) => sum + x.cents, 0);

  if (loading || !me) {
    return (
      <main className={styles.main}>
        <p className={styles.muted}>…</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.h1}>{t("financialsTitle")}</h1>
        <p className={styles.sub}>{t("financialsSubtitle")}</p>
        <p className={styles.storeHint}>
          <strong>{t("overviewStoreScope")}</strong> {storeLabel}
        </p>
      </div>

      {loadError ? (
        <p className={styles.error} role="alert">
          {loadError}
        </p>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("financialsYearSection")}</h2>
        <p className={styles.sectionLead}>{t("financialsYearLead")}</p>
        <div className={styles.toolbar}>
          <label>
            {t("financialsYearLabel")}{" "}
            <select className={styles.select} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {Array.from({ length: 6 }, (_, i) => today.getFullYear() - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={styles.button}
            onClick={() =>
              downloadCsv(
                `financials-${year}-monthly.csv`,
                ["month", "revenue_cents", "revenue_display"],
                yearMonthly.map((m) => [m.key, String(m.cents), formatMoney(m.cents, locale)]),
              )
            }
          >
            {t("financialsDownloadYearCsv")}
          </button>
        </div>
        <div className={styles.chartWrap}>
          <div className={styles.bars} style={{ ["--bar-count" as string]: String(yearMonthly.length) }}>
            {yearMonthly.map((m) => {
              const h = m.cents === 0 ? 6 : Math.max(10, (m.cents / maxYear) * 180);
              return (
                <div key={m.key} className={styles.barCol}>
                  <div className={styles.bar} style={{ height: `${h}px` }} />
                  <span className={styles.barValue}>{formatMoney(m.cents, locale)}</span>
                  <span className={styles.barLabel}>{m.key.slice(5)}</span>
                </div>
              );
            })}
          </div>
          <p className={styles.totals}>{t("financialsTotalYear", { amount: formatMoney(totalYear, locale) })}</p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("financialsMonthSection")}</h2>
        <p className={styles.sectionLead}>{t("financialsMonthLead")}</p>
        <div className={styles.toolbar}>
          <label>
            {t("financialsMonthLabel")}{" "}
            <input
              className={styles.select}
              type="month"
              value={month}
              max={formatLocalDateString(new Date()).slice(0, 7)}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={styles.button}
            onClick={() =>
              downloadCsv(
                `financials-${month}-daily.csv`,
                ["day", "revenue_cents", "revenue_display"],
                selectedMonthDays.map((d) => [d.key, String(d.cents), formatMoney(d.cents, locale)]),
              )
            }
          >
            {t("financialsDownloadMonthCsv")}
          </button>
        </div>
        <div className={styles.chartWrap}>
          <div className={styles.bars} style={{ ["--bar-count" as string]: String(selectedMonthDays.length || 1) }}>
            {selectedMonthDays.map((d) => {
              const h = d.cents === 0 ? 6 : Math.max(10, (d.cents / maxMonth) * 180);
              return (
                <div key={d.key} className={styles.barCol}>
                  <div className={styles.bar} style={{ height: `${h}px` }} />
                  <span className={styles.barValue}>{formatMoney(d.cents, locale)}</span>
                  <span className={styles.barLabel}>{d.key.slice(8)}</span>
                </div>
              );
            })}
          </div>
          <p className={styles.totals}>{t("financialsTotalMonth", { amount: formatMoney(totalMonth, locale) })}</p>
        </div>
      </section>
    </main>
  );
}
