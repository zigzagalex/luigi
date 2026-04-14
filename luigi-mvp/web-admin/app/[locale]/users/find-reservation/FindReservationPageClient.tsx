"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "@/../i18n/useLocale";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import { useAdminStore } from "@/[locale]/components/admin/AdminStoreContext";
import { SHOP_ID } from "@/lib/AuthSession";
import {
  searchAdminReservations,
  updateAdminReservationStatus,
  type ApiAdminReservation,
} from "@/lib/reservationsApi";
import {
  mapApiToRow,
  type ReservationTableRow,
} from "@/[locale]/users/reservations/ReservationsFlowPageClient";
import {
  ReservationFlow,
  type ReservationFlowReservation,
  type ReservationFlowStatus,
} from "@/[locale]/components/admin/ReservationFlow";
import styles from "./find-reservation.module.css";

function formatCustomerAddress(api: ApiAdminReservation): string {
  const c = api.customer;
  const parts = [c.address1, c.address2, c.postal_code, c.city, c.country].filter(
    (x): x is string => typeof x === "string" && x.trim() !== "",
  );
  return parts.length ? parts.join(", ") : "—";
}

export function FindReservationPageClient() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const { me, loading } = useAdminAuth();
  const { selectedStoreId, stores } = useAdminStore();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [hits, setHits] = useState<ApiAdminReservation[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ReservationTableRow | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (loading) return;
    if (!me) {
      router.replace(`/${locale}/login?next=/${locale}/users/find-reservation`);
    }
  }, [loading, me, locale, router]);

  useEffect(() => {
    if (!me) return;
    if (debouncedQuery === "") {
      setHits([]);
      setLoadError(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearching(true);
      try {
        const rows = await searchAdminReservations({
          shopId: SHOP_ID,
          q: debouncedQuery,
          locale,
          includeCancelled,
          storeId: selectedStoreId,
          limit: 100,
        });
        if (cancelled) return;
        setHits(rows);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : t("findReservationLoadError"));
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me, debouncedQuery, includeCancelled, selectedStoreId, locale, t]);

  useEffect(() => {
    if (!selectedReservation) return;
    if (selectedStoreId === null) return;
    if (selectedReservation.reservation.storeId === selectedStoreId) return;
    setSelectedReservation(null);
  }, [selectedReservation, selectedStoreId]);

  const storeLabel = useMemo(() => {
    if (selectedStoreId === null) return t("overviewStoreAll");
    return stores.find((s) => s.id === selectedStoreId)?.city ?? t("overviewStoreAll");
  }, [selectedStoreId, stores, t]);

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
        <h1 className={styles.h1}>{t("findReservationTitle")}</h1>
        <p className={styles.sub}>{t("findReservationSubtitle")}</p>
        <p className={styles.storeHint}>
          {t("overviewStoreScope")} <strong>{storeLabel}</strong>
        </p>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchLabel}>
          <span className={styles.searchLabelText}>{t("findReservationSearchLabel")}</span>
          <input
            type="search"
            className={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("findReservationSearchPlaceholder")}
            autoComplete="off"
            aria-label={t("findReservationSearchLabel")}
          />
        </label>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={includeCancelled}
            onChange={(e) => setIncludeCancelled(e.target.checked)}
          />
          {t("findReservationIncludeCancelled")}
        </label>
      </div>

      {loadError ? (
        <p className={styles.error} role="alert">
          {loadError}
        </p>
      ) : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("findReservationColId")}</th>
              <th>{t("findReservationColStatus")}</th>
              <th>{t("findReservationColPickup")}</th>
              <th>{t("findReservationColReturn")}</th>
              <th>{t("findReservationColCustomer")}</th>
              <th>{t("colEmail")}</th>
              <th>{t("colPhone")}</th>
              <th>{t("findReservationColAddress")}</th>
              <th>{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {searching && debouncedQuery !== "" ? (
              <tr>
                <td colSpan={9} className={styles.emptyCell}>
                  …
                </td>
              </tr>
            ) : hits.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyCell}>
                  {debouncedQuery === "" ? t("findReservationEmptyPrompt") : t("findReservationEmpty")}
                </td>
              </tr>
            ) : (
              hits.map((api) => {
                const row = mapApiToRow(api);
                return (
                  <tr key={api.reservation_id}>
                    <td>{api.reservation_id}</td>
                    <td>{api.status}</td>
                    <td>{row.reservation.pickupDate}</td>
                    <td>{row.reservation.returnDate}</td>
                    <td>
                      {[row.customer.firstName, row.customer.lastName].filter((x) => x !== "—").join(" ") ||
                        "—"}
                    </td>
                    <td>{row.customer.email}</td>
                    <td>{row.customer.phone}</td>
                    <td className={styles.addressCell}>{formatCustomerAddress(api)}</td>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedReservation ? (
        <div className={styles.flowOverlay} role="presentation">
          <div className={styles.flowPanel}>
            <div className={styles.flowHead}>
              <h2 className={styles.flowTitle}>
                {t("findReservationFlowTitle", { id: String(selectedReservation.reservation.id) })}
              </h2>
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
      setHits((prev) =>
        prev.map((r) =>
          r.reservation_id === next.id ? { ...r, status: updated.status, version: updated.version } : r,
        ),
      );
      setSelectedReservation((prev) =>
        prev && prev.reservation.id === next.id ? { ...prev, reservation: nextWithVersion } : prev,
      );
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("findReservationUpdateError"));
      setSelectedReservation(current);
    } finally {
      setSaving(false);
    }
  }
}
