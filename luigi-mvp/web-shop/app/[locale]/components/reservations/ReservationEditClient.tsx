"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

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
  const t = useTranslations("reservationEdit");
  const locale = useLocale();
  const router = useRouter();

  const [view, setView] = useState<ReservationView>(initialReservation);
  const r = view.reservation;
  const store = view.store ?? null;

  const createdDate = useMemo(() => new Date(r.created_at).toLocaleString(locale), [r.created_at, locale]);
  const startDate = useMemo(() => new Date(r.start_at).toLocaleDateString(locale), [r.start_at, locale]);
  const endDate = useMemo(() => new Date(r.end_at).toLocaleDateString(locale), [r.end_at, locale]);

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

      setDetailsSaved(t("saved"));
      router.refresh();
    } catch (e: any) {
      setDetailsError(e?.message ?? t("saveFailed"));
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
      setItemsError(e?.message ?? t("removeFailed"));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.topRow}>
        <div className={styles.breadcrumb}>
          <Link className={styles.backLink} href={`/reservations/${r.id}`}>
            {t("backToReservation")}
          </Link>
          <span className={styles.dot}>•</span>
          <Link className={styles.backLinkMuted} href="/reservations">
            {t("allReservations")}
          </Link>
        </div>

        <div className={styles.rightHint}>
          {t("created", { date: createdDate })}
        </div>
      </div>

      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.hTitle}>{t("title", { id: String(r.id) })}</div>
          <div className={styles.range}>
            {startDate} → {endDate}
          </div>
          <div className={styles.smallMuted}>
            {t("dateChangesSoon")}
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
          {t("cancelledDisabled")}
        </div>
      )}

      <div className={styles.grid}>
        {/* LEFT: items */}
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardTitle}>{t("items")}</div>
            <div className={styles.cardSubtitle}>
              {t("itemsSubtitle")}
            </div>
          </div>

          {itemsError && <div className={styles.errorBox}>{itemsError}</div>}

          {activeItems.length === 0 ? (
            <div className={styles.muted}>{t("noActiveItems")}</div>
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
                        alt={it.product_name ?? t("itemAlt")}
                        className={styles.itemImg}
                      />
                    </div>

                    <div className={styles.itemInfo}>
                      <div className={styles.itemTitle}>
                        {it.product_name ?? t("unnamedProduct")}
                      </div>
                      {it.variant_text ? (
                        <div className={styles.itemMeta}>{it.variant_text}</div>
                      ) : null}
                      <div className={styles.itemMeta}>
                        {ri.quantity}× · {money(ri.unit_price_cents, r.currency)} {t("each")}
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
                          {t("remove")}
                        </button>
                      ) : (
                        <div className={styles.inlineConfirm}>
                          <button
                            className={styles.btnGhostSmall}
                            onClick={() => setPendingRemoveId(null)}
                            disabled={isRemoving}
                          >
                            {t("keep")}
                          </button>
                          <button
                            className={styles.btnDangerSmall}
                            onClick={() => onConfirmRemoveItem(ri.id)}
                            disabled={isCancelled || isRemoving}
                          >
                            {isRemoving ? t("removing") : t("confirm")}
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
              <div className={styles.cardTitle}>{t("pickupPerson")}</div>
              <div className={styles.cardSubtitle}>{t("pickupPersonSubtitle")}</div>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <div className={styles.label}>{t("name")}</div>
                <input
                  className={styles.input}
                  value={pickupName}
                  onChange={(e) => setPickupName(e.target.value)}
                  disabled={isCancelled || savingDetails}
                  placeholder={t("fullNamePlaceholder")}
                />
              </label>

              <label className={styles.field}>
                <div className={styles.label}>{t("email")}</div>
                <input
                  className={styles.input}
                  value={pickupEmail}
                  onChange={(e) => setPickupEmail(e.target.value)}
                  disabled={isCancelled || savingDetails}
                  placeholder={t("emailPlaceholder")}
                />
              </label>

              <label className={styles.field}>
                <div className={styles.label}>{t("phone")}</div>
                <input
                  className={styles.input}
                  value={pickupPhone}
                  onChange={(e) => setPickupPhone(e.target.value)}
                  disabled={isCancelled || savingDetails}
                  placeholder={t("phonePlaceholder")}
                />
              </label>
            </div>
          </div>

          {/* Pickup location */}
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>{t("pickupLocation")}</div>
              <div className={styles.cardSubtitle}>{t("pickupLocationSubtitle")}</div>
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

          {/* Notes */}
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>{t("notes")}</div>
              <div className={styles.cardSubtitle}>{t("notesSubtitle")}</div>
            </div>

            <label className={styles.field}>
              <div className={styles.label}>{t("notes")}</div>
              <textarea
                className={styles.textarea}
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isCancelled || savingDetails}
                placeholder={t("notesPlaceholder")}
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
                {savingDetails ? t("saving") : t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}