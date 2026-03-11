"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import type { ReservationView } from "@/lib/reservationClient";
import { cancelReservation } from "@/lib/reservationClient";

import styles from "./ReservationDetailsClient.module.css";
import ReservationStatusBadge from "./ReservationStatusBadge";
import ReservationItemsFullList from "./ReservationItemsFullList";
import CancelReservationModal from "./CancelReservationModal";

type Props = {
  initialReservation: ReservationView;
  shopId: number;
};

function money(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export default function ReservationDetailsClient({ initialReservation, shopId }: Props) {
  const t = useTranslations("reservationDetails");
  const locale = useLocale();
  const router = useRouter();
  const [reservationView, setReservationView] = useState<ReservationView>(initialReservation);

  const r = reservationView.reservation;
  const store = reservationView.store ?? null;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const createdDate = useMemo(() => new Date(r.created_at).toLocaleString(locale), [r.created_at, locale]);
  const updatedDate = useMemo(() => new Date(r.updated_at).toLocaleString(locale), [r.updated_at, locale]);
  const startDate = useMemo(() => new Date(r.start_at).toLocaleDateString(locale), [r.start_at, locale]);
  const endDate = useMemo(() => new Date(r.end_at).toLocaleDateString(locale), [r.end_at, locale]);

  const cancelledAtLabel = useMemo(() => {
    return r.cancelled_at ? new Date(r.cancelled_at).toLocaleString(locale) : null;
  }, [r.cancelled_at, locale]);

  const paymentMethod =
    (r as any).payment_method ?? (r as any).payment_method_name ?? t("payAtPickup");

  const paymentStatus =
    r.status === "pending" ? t("pendingPayment") : r.status === "cancelled" ? t("cancelled") : t("dash");

  const isCancelled = r.status === "cancelled" || !!r.cancelled_at;

  async function onConfirmCancel(reason: string) {
    setCancelBusy(true);
    setCancelError(null);

    try {
      const updated = await cancelReservation(r.id, {
        shop_id: shopId,
        expected_version: r.version,
        cancel_reason: reason?.trim() ? reason.trim() : undefined,
      });

      setReservationView(updated);
      setCancelOpen(false);
      router.refresh();
    } catch (e: any) {
      setCancelError(e?.message ?? t("cancelFailed"));
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.topRow}>
        <div className={styles.breadcrumb}>
          <Link className={styles.backLink} href="/reservations">
            {t("backToReservations")}
          </Link>
        </div>
      </div>

      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.hTitle}>{t("reservationNumber", { id: String(r.id) })}</div>
          <div className={styles.hSub}>
            <span className={styles.muted}>{t("created")}</span> {createdDate}
            <span className={styles.dot}>•</span>
            <span className={styles.muted}>{t("updated")}</span> {updatedDate}
          </div>

          <div className={styles.range}>
            {startDate} → {endDate}
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.total}>{money(r.total_price_cents, r.currency)}</div>
          <ReservationStatusBadge status={r.status} cancelledAt={r.cancelled_at} />
          {(store?.name || r.store_snapshot_name) && (
            <div className={styles.storeName}>{store?.name ?? r.store_snapshot_name}</div>
          )}
        </div>
      </div>

      {isCancelled && (
        <div className={styles.infoCard}>
          <div className={styles.infoTitle}>{t("cancellation")}</div>
          <div className={styles.infoGrid}>
            <div className={styles.infoKey}>{t("cancelledAt")}</div>
            <div className={styles.infoVal}>{cancelledAtLabel ?? t("dash")}</div>

            <div className={styles.infoKey}>{t("reason")}</div>
            <div className={styles.infoVal}>{r.cancel_reason ?? t("dash")}</div>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>{t("items")}</div>
          </div>

          <ReservationItemsFullList items={reservationView.items} currency={r.currency} />
        </div>

        <div className={styles.side}>
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>{t("pickupDetails")}</div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>{t("name")}</div>
              <div className={styles.v}>{r.pickup_person_name ?? t("dash")}</div>

              <div className={styles.k}>{t("phone")}</div>
              <div className={styles.v}>{r.pickup_person_phone ?? t("dash")}</div>

              <div className={styles.k}>{t("email")}</div>
              <div className={styles.v}>{r.pickup_person_email ?? t("dash")}</div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>{t("pickupLocation")}</div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>{t("store")}</div>
              <div className={styles.v}>{store?.name ?? r.store_snapshot_name ?? t("dash")}</div>

              <div className={styles.k}>{t("address")}</div>
              <div className={styles.v}>
                {store?.address1 ? (
                  <>
                    {store.address1}
                    <br />
                    {store.postal_code} {store.city}
                  </>
                ) : (
                  t("dash")
                )}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>{t("payment")}</div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>{t("method")}</div>
              <div className={styles.v}>{paymentMethod}</div>

              <div className={styles.k}>{t("status")}</div>
              <div className={styles.v}>{paymentStatus}</div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>{t("notes")}</div>
            </div>

            <div className={styles.notes}>
              {r.notes?.trim() ? r.notes : <span className={styles.muted}>{t("noNotes")}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.bottomActions}>
        

        <button
          className={styles.dangerButton}
          onClick={() => setCancelOpen(true)}
          disabled={isCancelled}
          title={isCancelled ? t("alreadyCancelledTitle") : t("cancelTitle")}
        >
          {t("cancelReservation")}
        </button>
      </div>

      <CancelReservationModal
        open={cancelOpen}
        busy={cancelBusy}
        error={cancelError}
        reservationId={r.id}
        onClose={() => {
          if (!cancelBusy) {
            setCancelOpen(false);
            setCancelError(null);
          }
        }}
        onConfirm={onConfirmCancel}
      />
    </div>
  );
}