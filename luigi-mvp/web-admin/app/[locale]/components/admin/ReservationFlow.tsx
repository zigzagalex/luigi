"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./ReservationFlow.module.css";

export type ReservationFlowStatus =
  | "confirmed"
  | "out_for_pickup"
  | "in_use"
  | "returned"
  | "serviced"
  | "closed"
  | "cancelled"
  | "expired";

export type ReservationFlowItem = {
  id: string;
  name: string;
  details?: string;
};

export type ReservationFlowReservation = {
  id: number | string;
  storeId?: number;
  storeName?: string;
  customerName: string;
  customerPhone?: string;
  pickupDate: string;
  returnDate: string;
  status: ReservationFlowStatus;
  version?: number;
  totalPriceCents?: number;
  currency?: string;
  items: ReservationFlowItem[];
};

type ChecklistMode = "prepare" | "return" | "service";

const ACTIVE_STEPS: ReservationFlowStatus[] = [
  "confirmed",
  "out_for_pickup",
  "in_use",
  "returned",
  "serviced",
  "closed",
];

const FINAL_STEPS: ReservationFlowStatus[] = ["cancelled", "expired", "closed"];

const STATUS_MESSAGE_KEYS: Record<ReservationFlowStatus, string> = {
  confirmed: "statusConfirmed",
  out_for_pickup: "statusOutForPickup",
  in_use: "statusInUse",
  returned: "statusReturned",
  serviced: "statusServiced",
  closed: "statusClosed",
  cancelled: "statusCancelled",
  expired: "statusExpired",
};

function isTerminal(status: ReservationFlowStatus) {
  return status === "closed" || status === "cancelled" || status === "expired";
}

function isStaffOrAdmin(role: string | null | undefined) {
  const normalized = (role ?? "").toLowerCase().trim();
  return normalized === "admin" || normalized === "staff";
}

function formatMoney(cents: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function ReservationFlow({
  reservation: reservationProp,
  meRole,
  onReservationChange,
  onDownloadInvoice,
  locale = "de",
}: {
  reservation: ReservationFlowReservation;
  meRole: string | null | undefined;
  onReservationChange?: (next: ReservationFlowReservation) => void;
  onDownloadInvoice?: (reservationId: number | string) => Promise<void> | void;
  locale?: string;
}) {
  const t = useTranslations("admin");
  const [reservation, setReservation] = useState<ReservationFlowReservation>(reservationProp);
  useEffect(() => {
    setReservation(reservationProp);
  }, [reservationProp]);

  function statusLabel(status: ReservationFlowStatus) {
    return t(STATUS_MESSAGE_KEYS[status] as Parameters<typeof t>[0]);
  }

  function updateReservation(next: ReservationFlowReservation) {
    setReservation(next);
    onReservationChange?.(next);
  }

  const [checklistMode, setChecklistMode] = useState<ChecklistMode | null>(null);
  const [checkedItemIds, setCheckedItemIds] = useState<Record<string, boolean>>({});
  const [showPickupConfirm, setShowPickupConfirm] = useState(false);
  const [idChecked, setIdChecked] = useState(false);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const canManage = isStaffOrAdmin(meRole);
  const itemCount = reservation.items.length;
  const checkedCount = useMemo(
    () => reservation.items.reduce((sum, item) => sum + (checkedItemIds[item.id] ? 1 : 0), 0),
    [checkedItemIds, reservation.items],
  );
  const allItemsChecked = itemCount > 0 && checkedCount === itemCount;
  const activeIndex = ACTIVE_STEPS.indexOf(reservation.status);
  const canDownloadInvoice = ["in_use", "returned", "serviced", "closed"].includes(reservation.status);

  function startChecklist(mode: ChecklistMode) {
    setChecklistMode(mode);
    setCheckedItemIds({});
  }

  function closeChecklist() {
    setChecklistMode(null);
    setCheckedItemIds({});
  }

  function toggleItem(itemId: string) {
    setCheckedItemIds((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  function cancelReservation() {
    updateReservation({ ...reservation, status: "cancelled" });
    closeChecklist();
    setShowPickupConfirm(false);
  }

  function setOutForPickup() {
    if (!allItemsChecked) return;
    updateReservation({ ...reservation, status: "out_for_pickup" });
    closeChecklist();
  }

  function confirmPickup() {
    if (!idChecked || !paymentReceived) return;
    updateReservation({ ...reservation, status: "in_use" });
    setShowPickupConfirm(false);
    setIdChecked(false);
    setPaymentReceived(false);
  }

  function setReturned() {
    if (!allItemsChecked) return;
    updateReservation({ ...reservation, status: "returned" });
    closeChecklist();
  }

  function setServiced() {
    if (!allItemsChecked) return;
    updateReservation({ ...reservation, status: "serviced" });
    closeChecklist();
  }

  function closeReservation() {
    updateReservation({ ...reservation, status: "closed" });
  }

  async function downloadInvoice() {
    if (!onDownloadInvoice) return;
    setInvoiceBusy(true);
    setInvoiceError(null);
    try {
      await onDownloadInvoice(reservation.id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("flowInvoiceFailed");
      setInvoiceError(message);
    } finally {
      setInvoiceBusy(false);
    }
  }

  const totalLabel =
    typeof reservation.totalPriceCents === "number"
      ? formatMoney(reservation.totalPriceCents, reservation.currency ?? "CHF", locale)
      : null;

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{t("flowTitle", { id: reservation.id })}</h2>
          <p className={styles.sub}>
            {reservation.customerName} ·{" "}
            {t("flowDateRange", { pickup: reservation.pickupDate, return: reservation.returnDate })}
          </p>
          <p className={styles.metaLine}>
            {reservation.storeName ? t("flowStore", { store: reservation.storeName }) : null}
            {reservation.storeName && reservation.customerPhone ? " · " : null}
            {reservation.customerPhone ? t("flowPhone", { phone: reservation.customerPhone }) : null}
            {(reservation.storeName || reservation.customerPhone) && totalLabel ? " · " : null}
            {totalLabel ? t("flowTotal", { total: totalLabel }) : null}
          </p>
        </div>
        <p className={styles.statusPill}>{statusLabel(reservation.status)}</p>
      </header>

      <div className={styles.progressWrap} aria-label={t("flowProgressLabel")}>
        <ol className={styles.progressList}>
          {ACTIVE_STEPS.map((status, index) => {
            const reached = activeIndex >= index || reservation.status === "cancelled" || reservation.status === "expired";
            const current = reservation.status === status;
            return (
              <li key={status} className={styles.progressStep}>
                <span className={current ? styles.stepCurrent : reached ? styles.stepDone : styles.stepPending}>
                  {statusLabel(status)}
                </span>
              </li>
            );
          })}
        </ol>
        <p className={styles.finalStates}>
          {t("flowFinalStates", { states: FINAL_STEPS.map((status) => statusLabel(status)).join(", ") })}
        </p>
      </div>

      <div className={styles.itemsWrap}>
        <h3 className={styles.itemsTitle}>{t("flowItemsTitle")}</h3>
        <ul className={styles.itemsList}>
          {reservation.items.map((item) => (
            <li key={item.id} className={styles.itemRow}>
              <div>
                <p className={styles.itemName}>{item.name}</p>
                {item.details ? <p className={styles.itemDetails}>{item.details}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {checklistMode ? (
        <div className={styles.checklistWrap}>
          <p className={styles.checklistTitle}>
            {checklistMode === "prepare"
              ? t("flowChecklistPrepare")
              : checklistMode === "return"
                ? t("flowChecklistReturn")
                : t("flowChecklistService")}
          </p>
          <ul className={styles.checklistList}>
            {reservation.items.map((item) => (
              <li key={item.id}>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={Boolean(checkedItemIds[item.id])}
                    onChange={() => toggleItem(item.id)}
                  />
                  <span>{item.name}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className={styles.checklistMeta}>{t("flowCheckedCount", { checked: checkedCount, total: itemCount })}</p>
        </div>
      ) : null}

      <div className={styles.actions}>
        {canManage ? (
          <>
            {canDownloadInvoice ? (
              <button type="button" className={styles.actionBtn} onClick={downloadInvoice} disabled={invoiceBusy}>
                {invoiceBusy ? t("flowGeneratingInvoice") : t("flowGenerateInvoice")}
              </button>
            ) : null}
            {reservation.status === "confirmed" && !checklistMode ? (
              <button type="button" className={styles.actionBtn} onClick={() => startChecklist("prepare")}>
                {t("flowPrepareForPickup")}
              </button>
            ) : null}
            {reservation.status === "confirmed" && checklistMode === "prepare" ? (
              <>
                <button type="button" className={styles.actionBtn} onClick={setOutForPickup} disabled={!allItemsChecked}>
                  {t("flowSetReadyForPickup")}
                </button>
                <button type="button" className={styles.actionBtn} onClick={closeChecklist}>
                  {t("cancel")}
                </button>
              </>
            ) : null}

            {reservation.status === "out_for_pickup" ? (
              <button type="button" className={styles.actionBtn} onClick={() => setShowPickupConfirm(true)}>
                {t("flowPickedUp")}
              </button>
            ) : null}

            {reservation.status === "in_use" && !checklistMode ? (
              <button type="button" className={styles.actionBtn} onClick={() => startChecklist("return")}>
                {t("flowReturnItems")}
              </button>
            ) : null}
            {reservation.status === "in_use" && checklistMode === "return" ? (
              <>
                <button type="button" className={styles.actionBtn} onClick={setReturned} disabled={!allItemsChecked}>
                  {t("flowReturnedReadyForService")}
                </button>
                <button type="button" className={styles.actionBtn} onClick={closeChecklist}>
                  {t("cancel")}
                </button>
              </>
            ) : null}

            {reservation.status === "returned" && !checklistMode ? (
              <button type="button" className={styles.actionBtn} onClick={() => startChecklist("service")}>
                {t("flowStartServiceChecklist")}
              </button>
            ) : null}
            {reservation.status === "returned" && checklistMode === "service" ? (
              <>
                <button type="button" className={styles.actionBtn} onClick={setServiced} disabled={!allItemsChecked}>
                  {t("flowSetServiced")}
                </button>
                <button type="button" className={styles.actionBtn} onClick={closeChecklist}>
                  {t("cancel")}
                </button>
              </>
            ) : null}

            {reservation.status === "serviced" ? (
              <button type="button" className={styles.actionBtn} onClick={closeReservation}>
                {t("flowCloseReservation")}
              </button>
            ) : null}
          </>
        ) : (
          <p className={styles.readonly}>{t("flowReadonly")}</p>
        )}

        {canManage && !isTerminal(reservation.status) ? (
          <button type="button" className={styles.cancelBtn} onClick={cancelReservation}>
            {t("flowCancelReservation")}
          </button>
        ) : null}
      </div>
      {invoiceError ? <p className={styles.readonly}>{invoiceError}</p> : null}

      {showPickupConfirm ? (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={t("flowConfirmPickupTitle")}>
            <h3 className={styles.modalTitle}>{t("flowConfirmPickupTitle")}</h3>
            <p className={styles.modalSub}>{t("flowConfirmPickupSub")}</p>
            <label className={styles.checkboxRow}>
              <input type="checkbox" checked={idChecked} onChange={(e) => setIdChecked(e.target.checked)} />
              <span>{t("flowIdChecked")}</span>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.checked)}
              />
              <span>{t("flowPaymentReceived")}</span>
            </label>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={confirmPickup}
                disabled={!idChecked || !paymentReceived}
              >
                {t("flowConfirmPickup")}
              </button>
              <button type="button" className={styles.actionBtn} onClick={() => setShowPickupConfirm(false)}>
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
