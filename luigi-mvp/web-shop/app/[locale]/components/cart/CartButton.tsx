"use client";

import { useTranslations } from "next-intl";
import styles from "./CartButton.module.css";

export function CartButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  const t = useTranslations("cartButton");
  return (
    <button type="button" className={styles.btn} onClick={onClick} aria-label={t("openAria")}>
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path
            d="M3 5h2l2.2 10.2a1.2 1.2 0 0 0 1.2.95h7.95a1.2 1.2 0 0 0 1.17-.88L20 8H7.1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="19" r="1.2" fill="currentColor" />
          <circle cx="17" cy="19" r="1.2" fill="currentColor" />
        </svg>
      </span>
      {count > 0 && <span className={styles.badge}>{count}</span>}
    </button>
  );
}
