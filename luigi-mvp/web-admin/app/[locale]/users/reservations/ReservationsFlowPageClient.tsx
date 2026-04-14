"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "@/../i18n/useLocale";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import { useAdminStore } from "@/[locale]/components/admin/AdminStoreContext";
import { SHOP_ID } from "@/lib/AuthSession";
import {
  listAdminReservations,
  updateAdminReservationStatus,
  type ApiAdminReservation,
} from "@/lib/reservationsApi";
import {
  ReservationFlow,
  type ReservationFlowReservation,
  type ReservationFlowStatus,
} from "@/[locale]/components/admin/ReservationFlow";
import styles from "./reservations.module.css";

type ReservationTableRow = {
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

export function ReservationsFlowPageClient() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const { me, loading } = useAdminAuth();
  const { selectedStoreId } = useAdminStore();
  const [rows, setRows] = useState<ReservationTableRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ReservationTableRow | null>(null);
  const reservationsToPrepare = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.reservation.status === "confirmed" &&
          (selectedStoreId === null || row.reservation.storeId === selectedStoreId),
      ),
    [rows, selectedStoreId],
  );
  const reservationsReadyForPickup = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.reservation.status === "out_for_pickup" &&
          (selectedStoreId === null || row.reservation.storeId === selectedStoreId),
      ),
    [rows, selectedStoreId],
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
        const [confirmedRows, readyRows] = await Promise.all([
          listAdminReservations(SHOP_ID, "confirmed"),
          listAdminReservations(SHOP_ID, "out_for_pickup"),
        ]);
        if (cancelled) return;
        const mapped = [...confirmedRows, ...readyRows].map(mapApiToRow);
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
  }, [me]);

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
        <h1 className={styles.h1}>{t("reservationsFlowTitle")}</h1>
        <p className={styles.sub}>{t("reservationsFlowSubtitle")}</p>
      </div>
      {loadError ? (
        <p className={styles.error} role="alert">
          {loadError}
        </p>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("pickupToPrepareTitle")}</h2>
        {renderTable(reservationsToPrepare)}
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("pickupReadyTitle")}</h2>
        {renderTable(reservationsReadyForPickup)}
      </section>

      {selectedReservation ? (
        <div className={styles.flowOverlay} role="presentation">
          <div className={styles.flowPanel}>
            <div className={styles.flowHead}>
              <h2 className={styles.flowTitle}>Reservation {selectedReservation.reservation.id} flow</h2>
              <button type="button" className={styles.actionBtn} onClick={() => setSelectedReservation(null)}>
                {t("close")}
              </button>
            </div>
            <ReservationFlow
              reservation={selectedReservation.reservation}
              meRole={me.role}
              onReservationChange={(next) => void handleReservationChange(selectedReservation, next)}
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

  function renderTable(tableRows: ReservationTableRow[]) {
    return (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Reservation</th>
              <th>Status</th>
              <th>Pickup</th>
              <th>Return</th>
              <th>Customer first name</th>
              <th>Customer last name</th>
              <th>Pickup first name</th>
              <th>Pickup last name</th>
              <th>Pickup phone</th>
              <th>Pickup email</th>
              <th>Actions</th>
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
                  <td>{row.reservation.status}</td>
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

function mapApiToRow(row: ApiAdminReservation): ReservationTableRow {
  const customerFirst = row.customer.first_name ?? "";
  const customerLast = row.customer.last_name ?? "";
  const pickupFirst = row.pickup_person.first_name ?? "";
  const pickupLast = row.pickup_person.last_name ?? "";
  return {
    reservation: {
      id: row.reservation_id,
      storeId: row.store_id,
      customerName: [customerFirst, customerLast].filter(Boolean).join(" ").trim() || "—",
      pickupDate: row.start_at.slice(0, 10),
      returnDate: row.end_at.slice(0, 10),
      status: row.status as ReservationFlowStatus,
      version: row.version,
      items: row.items.map((item) => ({
        id: String(item.id),
        name: item.name,
        details: item.details,
      })),
    },
    customer: {
      firstName: customerFirst || "—",
      lastName: customerLast || "—",
      phone: row.customer.phone ?? "—",
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
