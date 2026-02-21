"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { ReservationView } from "@/lib/reservationClient";
import {
  updateReservationDetails,
  cancelReservationItem,
} from "@/lib/reservationClient";

import styles from "./ReservationEditClient.module.css";
import ReservationStatusBadge from "./ReservationStatusBadge";

type Props = {
  initialReservation: ReservationView;
  shopId: number;
};

function money(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export default function ReservationEditClient({ initialReservation, shopId }: Props) {
  const router = useRouter();

  const [view, setView] = useState<ReservationView>(initialReservation);
  const r = view.reservation;
  const store = view.store ?? null;

  const createdDate = useMemo(() => new Date(r.created_at).toLocaleString(), [r.created_at]);
  const startDate = useMemo(() => new Date(r.start_at).toLocaleDateString(), [r.start_at]);
  const endDate = useMemo(() => new Date(r.end_at).toLocaleDateString(), [r.end_at]);

  // form state
  const [pickupName, setPickupName] = useState(r.pickup_person_name ?? "");
  const [pickupEmail, setPickupEmail] = useState(r.pickup_person_email ?? "");
  const [pickupPhone, setPickupPhone] = useState(r.pickup_person_phone ?? "");
  const [notes, setNotes] = useState(r.notes ?? "");

  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSaved, setDetailsSaved] = useState<string | null>(null);

  // item removal
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const isCancelled = r.status === "cancelled" || !!r.cancelled_at;

  const activeItems = useMemo(
    () => view.items.filter((it) => it.reservation_item.is_active),
    [view.items]
  );

  async function onSaveDetails() {
    setSavingDetails(true);
    setDetailsError(null);
    setDetailsSaved(null);

    try {
      const updated = await updateReservationDetails(r.id, {
        shop_id: shopId,
        expected_version: r.version,

        pickup_person_name: pickupName.trim() ? pickupName.trim() : null,
        pickup_person_email: pickupEmail.trim() ? pickupEmail.trim() : null,
        pickup_person_phone: pickupPhone.trim() ? pickupPhone.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      });

      setView(updated);

      // refresh local form values from returned DTO
      setPickupName(updated.reservation.pickup_person_name ?? "");
      setPickupEmail(updated.reservation.pickup_person_email ?? "");
      setPickupPhone(updated.reservation.pickup_person_phone ?? "");
      setNotes(updated.reservation.notes ?? "");

      setDetailsSaved("Saved.");
      router.refresh();
    } catch (e: any) {
      setDetailsError(e?.message ?? "Failed to save changes.");
    } finally {
      setSavingDetails(false);
      // auto-hide "Saved" after a bit
      setTimeout(() => setDetailsSaved(null), 1500);
    }
  }

  async function onConfirmRemoveItem(reservationItemId: number) {
    setRemovingId(reservationItemId);
    setItemsError(null);

    try {
      const updated = await cancelReservationItem(r.id, reservationItemId, {
        shop_id: shopId,
        expected_version: r.version,
      });

      setView(updated);
      setPendingRemoveId(null);
      router.refresh();
    } catch (e: any) {
      setItemsError(e?.message ?? "Failed to remove item.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.topRow}>
        <div className={styles.breadcrumb}>
          <Link className={styles.backLink} href={`/reservations/${r.id}`}>
            ← Back to reservation
          </Link>
          <span className={styles.dot}>•</span>
          <Link className={styles.backLinkMuted} href="/reservations">
            All reservations
          </Link>
        </div>

        <div className={styles.rightHint}>
          Created {createdDate}
        </div>
      </div>

      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.hTitle}>Edit reservation {r.id}</div>
          <div className={styles.range}>
            {startDate} → {endDate}
          </div>
          <div className={styles.smallMuted}>
            Date changes are coming next. For now you can edit pickup details and remove items.
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
        <div className={styles.warnCard}>
          This reservation is cancelled. Editing is disabled.
        </div>
      )}

      <div className={styles.grid}>
        {/* LEFT: items */}
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardTitle}>Items</div>
            <div className={styles.cardSubtitle}>
              Remove single items if needed.
            </div>
          </div>

          {itemsError && <div className={styles.errorBox}>{itemsError}</div>}

          {activeItems.length === 0 ? (
            <div className={styles.muted}>No active items.</div>
          ) : (
            <div className={styles.itemList}>
              {activeItems.map((it) => {
                const ri = it.reservation_item;
                const lineTotal = ri.unit_price_cents * ri.quantity;

                const isPending = pendingRemoveId === ri.id;
                const isRemoving = removingId === ri.id;

                return (
                  <div key={ri.id} className={styles.itemRow}>
                    <div className={styles.itemImgWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={it.image_url || "/placeholder.png"}
                        alt={it.product_name ?? "Item"}
                        className={styles.itemImg}
                      />
                    </div>

                    <div className={styles.itemInfo}>
                      <div className={styles.itemTitle}>
                        {it.product_name ?? "Unnamed product"}
                      </div>
                      {it.variant_text ? (
                        <div className={styles.itemMeta}>{it.variant_text}</div>
                      ) : null}
                      <div className={styles.itemMeta}>
                        {ri.quantity}× · {money(ri.unit_price_cents, r.currency)} each
                      </div>
                    </div>

                    <div className={styles.itemRight}>
                      <div className={styles.itemPrice}>{money(lineTotal, r.currency)}</div>

                      {!isPending ? (
                        <button
                          className={styles.btnDangerSmall}
                          onClick={() => setPendingRemoveId(ri.id)}
                          disabled={isCancelled || isRemoving}
                        >
                          Remove
                        </button>
                      ) : (
                        <div className={styles.inlineConfirm}>
                          <button
                            className={styles.btnGhostSmall}
                            onClick={() => setPendingRemoveId(null)}
                            disabled={isRemoving}
                          >
                            Keep
                          </button>
                          <button
                            className={styles.btnDangerSmall}
                            onClick={() => onConfirmRemoveItem(ri.id)}
                            disabled={isCancelled || isRemoving}
                          >
                            {isRemoving ? "Removing…" : "Confirm"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: details tiles */}
        <div className={styles.side}>
          {/* Pickup details */}
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>Pickup person</div>
              <div className={styles.cardSubtitle}>Used at pickup.</div>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <div className={styles.label}>Name</div>
                <input
                  className={styles.input}
                  value={pickupName}
                  onChange={(e) => setPickupName(e.target.value)}
                  disabled={isCancelled || savingDetails}
                  placeholder="Full name"
                />
              </label>

              <label className={styles.field}>
                <div className={styles.label}>Email</div>
                <input
                  className={styles.input}
                  value={pickupEmail}
                  onChange={(e) => setPickupEmail(e.target.value)}
                  disabled={isCancelled || savingDetails}
                  placeholder="email@example.com"
                />
              </label>

              <label className={styles.field}>
                <div className={styles.label}>Phone</div>
                <input
                  className={styles.input}
                  value={pickupPhone}
                  onChange={(e) => setPickupPhone(e.target.value)}
                  disabled={isCancelled || savingDetails}
                  placeholder="+41 …"
                />
              </label>
            </div>
          </div>

          {/* Pickup location */}
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>Pickup location</div>
              <div className={styles.cardSubtitle}>Where you collect the bikes.</div>
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

          {/* Notes */}
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>Notes</div>
              <div className={styles.cardSubtitle}>Optional.</div>
            </div>

            <label className={styles.field}>
              <div className={styles.label}>Notes</div>
              <textarea
                className={styles.textarea}
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isCancelled || savingDetails}
                placeholder="Add a note…"
              />
            </label>

            {detailsError && <div className={styles.errorBox}>{detailsError}</div>}
            {detailsSaved && <div className={styles.successBox}>{detailsSaved}</div>}

            <div className={styles.actionsRow}>
              <button
                className={styles.btnPrimary}
                onClick={onSaveDetails}
                disabled={isCancelled || savingDetails}
              >
                {savingDetails ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}