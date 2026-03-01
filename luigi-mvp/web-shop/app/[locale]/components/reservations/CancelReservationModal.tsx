"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./CancelReservationModal.module.css";

type Props = {
  open: boolean;
  busy?: boolean;
  error?: string | null;
  reservationId: number;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
};

const REASON_SUGGESTIONS = [
  "Change of plans",
  "Found a better alternative",
  "Dates no longer work",
  "Accidental reservation",
  "Other",
] as const;

export default function CancelReservationModal({
  open,
  busy = false,
  error,
  reservationId,
  onClose,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<(typeof REASON_SUGGESTIONS)[number]>("Change of plans");
  const [details, setDetails] = useState("");

  const combinedReason = useMemo(() => {
    const base = selected === "Other" ? "" : selected;
    const extra = details.trim();
    if (!base && !extra) return "";
    if (base && extra) return `${base}: ${extra}`;
    return base || extra;
  }, [selected, details]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    // reset each time it opens (feel free to remove if you want persistence)
    setSelected("Change of plans");
    setDetails("");
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      aria-hidden={!open}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Cancel reservation">
        <div className={styles.header}>
          <div className={styles.title}>Cancel reservation</div>
          <button className={styles.close} onClick={onClose} disabled={busy} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.notice}>
            You’re about to cancel <span className={styles.bold}>Reservation {reservationId}</span>.
            This will mark it as cancelled and may affect availability.
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Reason</label>
            <select
              className={styles.select}
              value={selected}
              onChange={(e) => setSelected(e.target.value as any)}
              disabled={busy}
            >
              {REASON_SUGGESTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Details <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add a short note (optional)…"
              disabled={busy}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button className={styles.secondary} onClick={onClose} disabled={busy}>
            Keep reservation
          </button>
          <button
            className={styles.danger}
            onClick={() => onConfirm(combinedReason)}
            disabled={busy}
            title="Confirm cancellation"
          >
            {busy ? "Cancelling…" : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}