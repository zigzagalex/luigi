"use client";

import { useEffect, useMemo, useState } from "react";
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
  customerName: string;
  pickupDate: string;
  returnDate: string;
  status: ReservationFlowStatus;
  version?: number;
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

const LABELS: Record<ReservationFlowStatus, string> = {
  confirmed: "Confirmed",
  out_for_pickup: "Out for pickup",
  in_use: "In use",
  returned: "Returned",
  serviced: "Serviced",
  closed: "Closed",
  cancelled: "Cancelled",
  expired: "Expired",
};

function isTerminal(status: ReservationFlowStatus) {
  return status === "closed" || status === "cancelled" || status === "expired";
}

function isStaffOrAdmin(role: string | null | undefined) {
  const normalized = (role ?? "").toLowerCase().trim();
  return normalized === "admin" || normalized === "staff";
}

export function ReservationFlow({
  reservation: reservationProp,
  meRole,
  onReservationChange,
  onDownloadInvoice,
}: {
  reservation: ReservationFlowReservation;
  meRole: string | null | undefined;
  onReservationChange?: (next: ReservationFlowReservation) => void;
  onDownloadInvoice?: (reservationId: number | string) => Promise<void> | void;
}) {
  const [reservation, setReservation] = useState<ReservationFlowReservation>(reservationProp);
  useEffect(() => {
    setReservation(reservationProp);
  }, [reservationProp]);

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
    } catch (e: any) {
      setInvoiceError(e?.message ?? "Invoice download failed.");
    } finally {
      setInvoiceBusy(false);
    }
  }

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Reservation {reservation.id}</h2>
          <p className={styles.sub}>
            {reservation.customerName} · {reservation.pickupDate} to {reservation.returnDate}
          </p>
        </div>
        <p className={styles.statusPill}>{LABELS[reservation.status]}</p>
      </header>

      <div className={styles.progressWrap} aria-label="Reservation progress">
        <ol className={styles.progressList}>
          {ACTIVE_STEPS.map((status, index) => {
            const reached = activeIndex >= index || reservation.status === "cancelled" || reservation.status === "expired";
            const current = reservation.status === status;
            return (
              <li key={status} className={styles.progressStep}>
                <span className={current ? styles.stepCurrent : reached ? styles.stepDone : styles.stepPending}>{LABELS[status]}</span>
              </li>
            );
          })}
        </ol>
        <p className={styles.finalStates}>Final states: {FINAL_STEPS.map((status) => LABELS[status]).join(", ")}</p>
      </div>

      <div className={styles.itemsWrap}>
        <h3 className={styles.itemsTitle}>Items in reservation</h3>
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
              ? "Prepare for pickup checklist"
              : checklistMode === "return"
                ? "Returned items checklist"
                : "Service checklist"}
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
          <p className={styles.checklistMeta}>
            {checkedCount}/{itemCount} checked
          </p>
        </div>
      ) : null}

      <div className={styles.actions}>
        {canManage ? (
          <>
            {canDownloadInvoice ? (
              <button type="button" className={styles.actionBtn} onClick={downloadInvoice} disabled={invoiceBusy}>
                {invoiceBusy ? "Generating invoice..." : "Generate invoice"}
              </button>
            ) : null}
            {reservation.status === "confirmed" && !checklistMode ? (
              <button type="button" className={styles.actionBtn} onClick={() => startChecklist("prepare")}>
                Prepare for pickup
              </button>
            ) : null}
            {reservation.status === "confirmed" && checklistMode === "prepare" ? (
              <>
                <button type="button" className={styles.actionBtn} onClick={setOutForPickup} disabled={!allItemsChecked}>
                  Set ready for pickup
                </button>
                <button type="button" className={styles.actionBtn} onClick={closeChecklist}>
                  Cancel
                </button>
              </>
            ) : null}

            {reservation.status === "out_for_pickup" ? (
              <button type="button" className={styles.actionBtn} onClick={() => setShowPickupConfirm(true)}>
                Picked up
              </button>
            ) : null}

            {reservation.status === "in_use" && !checklistMode ? (
              <button type="button" className={styles.actionBtn} onClick={() => startChecklist("return")}>
                Return items
              </button>
            ) : null}
            {reservation.status === "in_use" && checklistMode === "return" ? (
              <>
                <button type="button" className={styles.actionBtn} onClick={setReturned} disabled={!allItemsChecked}>
                  Returned and ready for service
                </button>
                <button type="button" className={styles.actionBtn} onClick={closeChecklist}>
                  Cancel
                </button>
              </>
            ) : null}

            {reservation.status === "returned" && !checklistMode ? (
              <button type="button" className={styles.actionBtn} onClick={() => startChecklist("service")}>
                Start service checklist
              </button>
            ) : null}
            {reservation.status === "returned" && checklistMode === "service" ? (
              <>
                <button type="button" className={styles.actionBtn} onClick={setServiced} disabled={!allItemsChecked}>
                  Set serviced
                </button>
                <button type="button" className={styles.actionBtn} onClick={closeChecklist}>
                  Cancel
                </button>
              </>
            ) : null}

            {reservation.status === "serviced" ? (
              <button type="button" className={styles.actionBtn} onClick={closeReservation}>
                Close reservation
              </button>
            ) : null}
          </>
        ) : (
          <p className={styles.readonly}>Staff/admin access required to transition this reservation.</p>
        )}

        {canManage && !isTerminal(reservation.status) ? (
          <button type="button" className={styles.cancelBtn} onClick={cancelReservation}>
            Cancel reservation
          </button>
        ) : null}
      </div>
      {invoiceError ? <p className={styles.readonly}>{invoiceError}</p> : null}

      {showPickupConfirm ? (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Pickup confirmation">
            <h3 className={styles.modalTitle}>Confirm pickup</h3>
            <p className={styles.modalSub}>Please confirm ID check and payment received.</p>
            <label className={styles.checkboxRow}>
              <input type="checkbox" checked={idChecked} onChange={(e) => setIdChecked(e.target.checked)} />
              <span>ID checked</span>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.checked)}
              />
              <span>Payment received</span>
            </label>
            <div className={styles.modalActions}>
              <button type="button" className={styles.actionBtn} onClick={confirmPickup} disabled={!idChecked || !paymentReceived}>
                Confirm pickup
              </button>
              <button type="button" className={styles.actionBtn} onClick={() => setShowPickupConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
