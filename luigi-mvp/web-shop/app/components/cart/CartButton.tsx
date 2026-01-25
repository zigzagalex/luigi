"use client";

import styles from "./CartButton.module.css";

export function CartButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.btn} onClick={onClick} aria-label="Open cart">
      <span className={styles.icon} aria-hidden="true">🛒</span>
      {count > 0 && <span className={styles.badge}>{count}</span>}
    </button>
  );
}
