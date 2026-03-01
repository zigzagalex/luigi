"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [reservationView, setReservationView] = useState<ReservationView>(initialReservation);

  const r = reservationView.reservation;
  const store = reservationView.store ?? null;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const createdDate = useMemo(() => new Date(r.created_at).toLocaleString(), [r.created_at]);
  const updatedDate = useMemo(() => new Date(r.updated_at).toLocaleString(), [r.updated_at]);
  const startDate = useMemo(() => new Date(r.start_at).toLocaleDateString(), [r.start_at]);
  const endDate = useMemo(() => new Date(r.end_at).toLocaleDateString(), [r.end_at]);

  const cancelledAtLabel = useMemo(() => {
    return r.cancelled_at ? new Date(r.cancelled_at).toLocaleString() : null;
  }, [r.cancelled_at]);

  const paymentMethod =
    (r as any).payment_method ?? (r as any).payment_method_name ?? "Pay at pickup";

  const paymentStatus =
    r.status === "pending" ? "Pending payment" : r.status === "cancelled" ? "Cancelled" : "—";

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
      setCancelError(e?.message ?? "Cancellation failed.");
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.topRow}>
        <div className={styles.breadcrumb}>
          <Link className={styles.backLink} href="/reservations">
            ← Back to reservations
          </Link>
        </div>
      </div>

      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.hTitle}>Reservation {r.id}</div>
          <div className={styles.hSub}>
            <span className={styles.muted}>Created:</span> {createdDate}
            <span className={styles.dot}>•</span>
            <span className={styles.muted}>Updated:</span> {updatedDate}
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
          <div className={styles.infoTitle}>Cancellation</div>
          <div className={styles.infoGrid}>
            <div className={styles.infoKey}>Cancelled at</div>
            <div className={styles.infoVal}>{cancelledAtLabel ?? "—"}</div>

            <div className={styles.infoKey}>Reason</div>
            <div className={styles.infoVal}>{r.cancel_reason ?? "—"}</div>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardTitle}>Items</div>
          </div>

          <ReservationItemsFullList items={reservationView.items} currency={r.currency} />
        </div>

        <div className={styles.side}>
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>Pickup details</div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>Name</div>
              <div className={styles.v}>{r.pickup_person_name ?? "—"}</div>

              <div className={styles.k}>Phone</div>
              <div className={styles.v}>{r.pickup_person_phone ?? "—"}</div>

              <div className={styles.k}>Email</div>
              <div className={styles.v}>{r.pickup_person_email ?? "—"}</div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>Pickup location</div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>Store</div>
              <div className={styles.v}>{store?.name ?? r.store_snapshot_name ?? "—"}</div>

              <div className={styles.k}>Address</div>
              <div className={styles.v}>
                {store?.address1 ? (
                  <>
                    {store.address1}
                    <br />
                    {store.postal_code} {store.city}
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>Payment</div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>Method</div>
              <div className={styles.v}>{paymentMethod}</div>

              <div className={styles.k}>Status</div>
              <div className={styles.v}>{paymentStatus}</div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>Notes</div>
            </div>

            <div className={styles.notes}>
              {r.notes?.trim() ? r.notes : <span className={styles.muted}>No notes.</span>}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.bottomActions}>
        

        <button
          className={styles.dangerButton}
          onClick={() => setCancelOpen(true)}
          disabled={isCancelled}
          title={isCancelled ? "Reservation is already cancelled" : "Cancel reservation"}
        >
          Cancel reservation
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