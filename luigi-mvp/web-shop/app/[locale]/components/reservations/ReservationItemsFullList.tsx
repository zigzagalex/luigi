"use client";

import type { ReservationItemView } from "@/lib/reservationClient";
import { useTranslations } from "next-intl";
import styles from "./ReservationItemsFullList.module.css";

type Props = {
  items: ReservationItemView[];
  currency: string;
};

function money(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export default function ReservationItemsFullList({ items, currency }: Props) {
  const t = useTranslations("reservationItemsFull");
  if (!items.length) {
    return <div className={styles.empty}>{t("empty")}</div>;
  }

  return (
    <div className={styles.list}>
      {items.map((item) => {
        const ri = item.reservation_item;
        const lineTotal = ri.unit_price_cents * ri.quantity;

        return (
          <div key={ri.id} className={styles.row}>
            <div className={styles.image}>
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.product_name ?? t("alt")}
                  className={styles.imageTag}
                />
              ) : (
                <div className={styles.imageFallback} />
              )}
            </div>

            <div className={styles.main}>
              <div className={styles.titleRow}>
                <div className={styles.name}>
                  {item.product_name ?? t("unnamedProduct")}
                </div>
                <div className={styles.lineTotal}>
                  {money(lineTotal, currency)}
                </div>
              </div>

              {item.variant_text && (
                <div className={styles.variant}>{item.variant_text}</div>
              )}

              <div className={styles.meta}>
                <span className={styles.unitPrice}>{money(ri.unit_price_cents, currency)}</span>
                <span className={styles.sep}>•</span>
                <span className={styles.qty}>{ri.quantity}×</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}