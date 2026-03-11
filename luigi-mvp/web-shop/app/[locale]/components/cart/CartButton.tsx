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
      <span className={styles.icon} aria-hidden="true">🛒</span>
      {count > 0 && <span className={styles.badge}>{count}</span>}
    </button>
  );
}
