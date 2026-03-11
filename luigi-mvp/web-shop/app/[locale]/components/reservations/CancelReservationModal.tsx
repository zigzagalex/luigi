"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./CancelReservationModal.module.css";

type Props = {
  open: boolean;
  busy?: boolean;
  error?: string | null;
  reservationId: number;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
};

export default function CancelReservationModal({
  open,
  busy = false,
  error,
  reservationId,
  onClose,
  onConfirm,
}: Props) {
  const t = useTranslations("cancelReservationModal");
  const reasonSuggestions = [
    t("reasonChangePlans"),
    t("reasonBetterAlternative"),
    t("reasonDatesNoWork"),
    t("reasonAccidental"),
    t("reasonOther"),
  ] as const;

  const [selected, setSelected] = useState<string>(reasonSuggestions[0]);
  const [details, setDetails] = useState("");

  const combinedReason = useMemo(() => {
    const base = selected === t("reasonOther") ? "" : selected;
    const extra = details.trim();
    if (!base && !extra) return "";
    if (base && extra) return `${base}: ${extra}`;
    return base || extra;
  }, [selected, details, t]);

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
    setSelected(reasonSuggestions[0]);
    setDetails("");
  }, [open, reasonSuggestions]);

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
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={t("ariaLabel")}>
        <div className={styles.header}>
          <div className={styles.title}>{t("title")}</div>
          <button className={styles.close} onClick={onClose} disabled={busy} aria-label={t("close")}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.notice}>{t("notice", { id: String(reservationId) })}</div>

          <div className={styles.field}>
            <label className={styles.label}>{t("reason")}</label>
            <select
              className={styles.select}
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={busy}
            >
              {reasonSuggestions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              {t("details")} <span className={styles.optional}>{t("optional")}</span>
            </label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t("detailsPlaceholder")}
              disabled={busy}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button className={styles.secondary} onClick={onClose} disabled={busy}>
            {t("keepReservation")}
          </button>
          <button
            className={styles.danger}
            onClick={() => onConfirm(combinedReason)}
            disabled={busy}
            title={t("confirmTitle")}
          >
            {busy ? t("cancelling") : t("confirmCancel")}
          </button>
        </div>
      </div>
    </div>
  );
}