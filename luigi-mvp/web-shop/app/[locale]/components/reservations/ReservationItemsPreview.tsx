"use client";

import { ReservationItemView } from "@/lib/reservationClient";
import { useTranslations } from "next-intl";
import styles from "./ReservationItemsPreview.module.css";

type Props = {
  items: ReservationItemView[];
};

export default function ReservationItemsPreview({ items }: Props) {
  const t = useTranslations("reservationItemsPreview");
  const preview = items.slice(0, 3);

  return (
    <div className={styles.container}>
      {preview.map((item) => (
        <div key={item.reservation_item.id} className={styles.item}>
          <div className={styles.image}>
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.product_name ?? t("alt")}
                className={styles.imageTag}
              />
            )}
          </div>

          <div className={styles.meta}>
            <div className={styles.name}>
              {item.product_name}
            </div>

            {item.variant_text && (
              <div className={styles.variant}>
                {item.variant_text}
              </div>
            )}

            <div className={styles.priceRow}>
              <span className={styles.price}>
                CHF {(item.reservation_item.unit_price_cents / 100).toFixed(2)}
              </span>
              <span className={styles.quantity}>
                {item.reservation_item.quantity}×
              </span>
            </div>
          </div>
        </div>
      ))}

      {items.length > 3 && (
        <div className={styles.more}>
          {t("more", { count: String(items.length - 3) })}
        </div>
      )}
    </div>
  );
}
