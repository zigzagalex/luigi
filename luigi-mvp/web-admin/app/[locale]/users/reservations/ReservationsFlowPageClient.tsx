"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "@/../i18n/useLocale";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import { useAdminStore } from "@/[locale]/components/admin/AdminStoreContext";
import { SHOP_ID } from "@/lib/AuthSession";
import {
  formatDisplayDateIso,
  formatIsoAsLocalDateString,
  formatInclusiveReturnDateString,
  formatLocalDateString,
} from "@/lib/adminReservationDates";
import {
  listAdminReservations,
  updateAdminReservationStatus,
  downloadAdminReservationInvoice,
  type ApiAdminReservation,
} from "@/lib/reservationsApi";
import {
  ReservationFlow,
  type ReservationFlowReservation,
  type ReservationFlowStatus,
} from "@/[locale]/components/admin/ReservationFlow";
import styles from "./reservations.module.css";

export type ReservationTableRow = {
  reservation: ReservationFlowReservation;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  pickupPerson: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
};

type ReservationsFlowView = "prepare" | "ready" | "dropoff" | "maintenance" | "both";

export function ReservationsFlowPageClient({ view = "both" }: { view?: ReservationsFlowView }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const { me, loading } = useAdminAuth();
  const { selectedStoreId, stores } = useAdminStore();
  const storeNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const store of stores) {
      map.set(store.id, store.name || store.city);
    }
    return map;
  }, [stores]);
  const [rows, setRows] = useState<ReservationTableRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ReservationTableRow | null>(null);
  const [pickupDateFilter, setPickupDateFilter] = useState(() => formatLocalDateString(new Date()));
  const pageTitleKey =
    view === "dropoff"
      ? "dropoffFlowTitle"
      : view === "maintenance"
        ? "maintenanceFlowTitle"
        : "reservationsFlowTitle";
  const pageSubtitleKey =
    view === "dropoff"
      ? "dropoffFlowSubtitle"
      : view === "maintenance"
        ? "maintenanceFlowSubtitle"
        : "reservationsFlowSubtitle";
  const dateFilterLabelKey =
    view === "dropoff"
      ? "dropoffDateFilterLabel"
      : view === "maintenance"
        ? "maintenanceDateFilterLabel"
        : "pickupDateFilterLabel";

  const reservationsToPrepareOverdue = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.reservation.status === "confirmed" &&
          row.reservation.pickupDate < pickupDateFilter &&
          (selectedStoreId === null || row.reservation.storeId === selectedStoreId),
      ),
    [rows, selectedStoreId, pickupDateFilter],
  );
  const reservationsToPrepareByDay = useMemo(() => {
    const upcoming = rows.filter(
      (row) =>
        row.reservation.status === "confirmed" &&
        row.reservation.pickupDate >= pickupDateFilter &&
        (selectedStoreId === null || row.reservation.storeId === selectedStoreId),
    );
    const byDay = new Map<string, ReservationTableRow[]>();
    for (const row of upcoming) {
      const day = row.reservation.pickupDate;
      const list = byDay.get(day);
      if (list) list.push(row);
      else byDay.set(day, [row]);
    }
    return Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows, selectedStoreId, pickupDateFilter]);
  const reservationsToPrepare = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.reservation.status === "confirmed" &&
          row.reservation.pickupDate === pickupDateFilter &&
          (selectedStoreId === null || row.reservation.storeId === selectedStoreId),
      ),
    [rows, selectedStoreId, pickupDateFilter],
  );
  const reservationsReadyForPickup = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.reservation.status === "out_for_pickup" &&
          row.reservation.pickupDate === pickupDateFilter &&
          (selectedStoreId === null || row.reservation.storeId === selectedStoreId),
      ),
    [rows, selectedStoreId, pickupDateFilter],
  );
  const reservationsMissedPickup = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.reservation.status === "out_for_pickup" &&
          row.reservation.pickupDate < pickupDateFilter &&
          (selectedStoreId === null || row.reservation.storeId === selectedStoreId),
      ),
    [rows, selectedStoreId, pickupDateFilter],
  );
  const reservationsDueForDropoff = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.reservation.status === "in_use" &&
          row.reservation.returnDate === pickupDateFilter &&
          (selectedStoreId === null || row.reservation.storeId === selectedStoreId),
      ),
    [rows, selectedStoreId, pickupDateFilter],
  );
  const reservationsOverdueDropoff = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.reservation.status === "in_use" &&
          row.reservation.returnDate < pickupDateFilter &&
          (selectedStoreId === null || row.reservation.storeId === selectedStoreId),
      ),
    [rows, selectedStoreId, pickupDateFilter],
  );
  const reservationsMaintenanceDue = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.reservation.status === "returned" &&
          row.reservation.returnDate === pickupDateFilter &&
          (selectedStoreId === null || row.reservation.storeId === selectedStoreId),
      ),
    [rows, selectedStoreId, pickupDateFilter],
  );

  useEffect(() => {
    if (loading) return;
    if (!me) {
      router.replace(`/${locale}/login?next=/${locale}/users/reservations`);
    }
  }, [loading, me, locale, router]);

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
        const mapped = [...confirmedRows, ...readyRows, ...inUseRows, ...returnedRows].map((row) =>
          mapApiToRow(row, storeNameById),
        );
        setRows(mapped);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Could not load reservations.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me, storeNameById]);

  useEffect(() => {
    if (!selectedReservation) return;
    if (selectedStoreId === null) return;
    if (selectedReservation.reservation.storeId === selectedStoreId) return;
    setSelectedReservation(null);
  }, [selectedReservation, selectedStoreId]);

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
        <h1 className={styles.h1}>{t(pageTitleKey)}</h1>
        <p className={styles.sub}>{t(pageSubtitleKey)}</p>
        <div className={styles.dateFilter}>
          <label className={styles.dateFilterLabel}>
            <span className={styles.dateFilterText}>{t(dateFilterLabelKey)}</span>
            <input
              type="date"
              className={styles.dateInput}
              value={pickupDateFilter}
              onChange={(e) =>
                setPickupDateFilter(e.target.value ? e.target.value : formatLocalDateString(new Date()))
              }
              aria-label={t(dateFilterLabelKey)}
            />
          </label>
        </div>
      </div>
      {loadError ? (
        <p className={styles.error} role="alert">
          {loadError}
        </p>
      ) : null}

      {view === "prepare" ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("pickupOverduePrepareTitle")}</h2>
            {renderTable(reservationsToPrepareOverdue)}
          </section>
          {reservationsToPrepareByDay.length === 0 ? (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                {t("pickupToPrepareTitleWithDate", {
                  date: formatDisplayDateIso(pickupDateFilter, locale),
                })}
              </h2>
              {renderTable([])}
            </section>
          ) : (
            reservationsToPrepareByDay.map(([day, dayRows]) => (
              <section key={day} className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  {t("pickupToPrepareTitleWithDate", {
                    date: formatDisplayDateIso(day, locale),
                  })}
                </h2>
                {renderTable(dayRows)}
              </section>
            ))
          )}
        </>
      ) : null}
      {view === "both" ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("pickupToPrepareTitle")}</h2>
          {renderTable(reservationsToPrepare)}
        </section>
      ) : null}
      {view === "both" || view === "ready" ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("pickupReadyTitle")}</h2>
            {renderTable(reservationsReadyForPickup)}
          </section>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("pickupMissedTitle")}</h2>
            {renderTable(reservationsMissedPickup)}
          </section>
        </>
      ) : null}
      {view === "dropoff" ? (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("dropoffDueTitle")}</h2>
            {renderTable(reservationsDueForDropoff)}
          </section>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("dropoffOverdueTitle")}</h2>
            {renderTable(reservationsOverdueDropoff)}
          </section>
        </>
      ) : null}
      {view === "maintenance" ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("maintenanceDueTitle")}</h2>
          {renderTable(reservationsMaintenanceDue)}
        </section>
      ) : null}

      {selectedReservation ? (
        <div className={styles.flowOverlay} role="presentation">
          <div className={styles.flowPanel}>
            <div className={styles.flowHead}>
              <h2 className={styles.flowTitle}>
                {t("flowTitleWithId", { id: selectedReservation.reservation.id })}
              </h2>
              <button type="button" className={styles.actionBtn} onClick={() => setSelectedReservation(null)}>
                {t("close")}
              </button>
            </div>
            <ReservationFlow
              reservation={selectedReservation.reservation}
              meRole={me.role}
              locale={locale}
              onReservationChange={(next) => void handleReservationChange(selectedReservation, next)}
              onDownloadInvoice={(reservationId) => void handleInvoiceDownload(reservationId)}
            />
          </div>
        </div>
      ) : null}
    </main>
  );

  async function handleReservationChange(current: ReservationTableRow, next: ReservationFlowReservation) {
    if (current.reservation.status === next.status) return;
    if (typeof next.id !== "number" || !next.version) return;
    try {
      setSaving(true);
      const updated = await updateAdminReservationStatus({
        reservationId: next.id,
        shopId: SHOP_ID,
        expectedVersion: next.version,
        status: next.status,
      });
      const nextWithVersion: ReservationFlowReservation = {
        ...next,
        status: updated.status as ReservationFlowStatus,
        version: updated.version,
      };
      setRows((prev) =>
        prev.map((row) => (row.reservation.id === next.id ? { ...row, reservation: nextWithVersion } : row)),
      );
      setSelectedReservation((prev) =>
        prev && prev.reservation.id === next.id ? { ...prev, reservation: nextWithVersion } : prev,
      );
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not update reservation status.");
      setSelectedReservation(current);
    } finally {
      setSaving(false);
    }
  }

  async function handleInvoiceDownload(reservationId: number | string) {
    if (typeof reservationId !== "number") {
      setLoadError("Could not download invoice for this reservation.");
      return;
    }
    try {
      setLoadError(null);
      await downloadAdminReservationInvoice({ reservationId, shopId: SHOP_ID });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not download invoice.");
    }
  }

  function statusLabel(status: ReservationFlowStatus) {
    switch (status) {
      case "confirmed":
        return t("statusConfirmed");
      case "out_for_pickup":
        return t("statusOutForPickup");
      case "in_use":
        return t("statusInUse");
      case "returned":
        return t("statusReturned");
      case "serviced":
        return t("statusServiced");
      case "closed":
        return t("statusClosed");
      case "cancelled":
        return t("statusCancelled");
      case "expired":
        return t("statusExpired");
      default:
        return status;
    }
  }

  function renderTable(tableRows: ReservationTableRow[]) {
    return (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("colReservation")}</th>
              <th>{t("colStatus")}</th>
              <th>{t("colPickup")}</th>
              <th>{t("colReturn")}</th>
              <th>{t("colCustomerFirstName")}</th>
              <th>{t("colCustomerLastName")}</th>
              <th>{t("colPickupFirstName")}</th>
              <th>{t("colPickupLastName")}</th>
              <th>{t("colPickupPhone")}</th>
              <th>{t("colPickupEmail")}</th>
              <th>{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td colSpan={11} className={styles.emptyCell}>
                  {t("pickupTableEmpty")}
                </td>
              </tr>
            ) : (
              tableRows.map((row) => (
                <tr key={row.reservation.id}>
                  <td>{row.reservation.id}</td>
                  <td>{statusLabel(row.reservation.status)}</td>
                  <td>{row.reservation.pickupDate}</td>
                  <td>{row.reservation.returnDate}</td>
                  <td>{row.customer.firstName}</td>
                  <td>{row.customer.lastName}</td>
                  <td>{row.pickupPerson.firstName}</td>
                  <td>{row.pickupPerson.lastName}</td>
                  <td>{row.pickupPerson.phone}</td>
                  <td>{row.pickupPerson.email}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => setSelectedReservation(row)}
                      disabled={saving}
                    >
                      {t("pickupOpenFlow")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }
}

export function mapApiToRow(
  row: ApiAdminReservation,
  storeNameById?: Map<number, string>,
): ReservationTableRow {
  const customerFirst = row.customer.first_name ?? "";
  const customerLast = row.customer.last_name ?? "";
  const pickupFirst = row.pickup_person.first_name ?? "";
  const pickupLast = row.pickup_person.last_name ?? "";
  const customerPhone = row.customer.phone ?? "";
  return {
    reservation: {
      id: row.reservation_id,
      storeId: row.store_id,
      storeName: storeNameById?.get(row.store_id),
      customerName: [customerFirst, customerLast].filter(Boolean).join(" ").trim() || "—",
      customerPhone: customerPhone || undefined,
      pickupDate: formatIsoAsLocalDateString(row.start_at),
      returnDate: formatInclusiveReturnDateString(row.end_at),
      status: row.status as ReservationFlowStatus,
      version: row.version,
      totalPriceCents: row.total_price_cents,
      currency: row.currency,
      items: row.items.map((item) => ({
        id: String(item.id),
        name: item.name,
        details: item.details,
      })),
    },
    customer: {
      firstName: customerFirst || "—",
      lastName: customerLast || "—",
      phone: customerPhone || "—",
      email: row.customer.email ?? "—",
    },
    pickupPerson: {
      firstName: pickupFirst || "—",
      lastName: pickupLast || "—",
      phone: row.pickup_person.phone ?? "—",
      email: row.pickup_person.email ?? "—",
    },
  };
}
