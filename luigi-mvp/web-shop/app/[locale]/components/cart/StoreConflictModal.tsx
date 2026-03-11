"use client";

import { useTranslations } from "next-intl";
import styles from "./StoreConflictModal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onClearCart: () => void;
};

export default function StoreConflictModal({
  open,
  onClose,
  onClearCart,
}: Props) {
  const t = useTranslations("storeConflictModal");
  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-conflict-title"
      >
        <h2 id="store-conflict-title">
          {t("title")}
        </h2>

        <p>
          {t("description")}
        </p>

        <p>
          {t("replacementNote")}
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={onClose}
          >
            {t("cancelAdd")}
          </button>

          <button
            type="button"
            className={styles.primary}
            onClick={onClearCart}
          >
            {t("clearAndAdd")}
          </button>
        </div>
      </div>
    </div>
  );
}
