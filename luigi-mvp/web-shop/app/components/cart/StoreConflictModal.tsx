"use client";

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
          Different pickup location
        </h2>

        <p>
          Your cart already contains items from another pickup location.
        </p>

        <p>
          If you continue, your current cart will be cleared and replaced
          with this item.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={onClose}
          >
            Don’t add item
          </button>

          <button
            type="button"
            className={styles.primary}
            onClick={onClearCart}
          >
            Clear cart & add item
          </button>
        </div>
      </div>
    </div>
  );
}
