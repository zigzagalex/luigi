"use client";

import Link from "next/link";
import { ReservationItemView } from "@/lib/reservationClient";
import { formatMoneyCentsCodeFirst } from "@/lib/formatMoney";
import { useLocale, useTranslations } from "next-intl";
import { localeHref } from "@/../i18n/localeHref";
import styles from "./ReservationItemsPreview.module.css";

type Props = {
  items: ReservationItemView[];
  defaultCurrency: string;
  /** Omit product title on this row (e.g. row 0 when title is shown as card hero). */
  hideNameAtIndex?: number;
};

export default function ReservationItemsPreview({
  items,
  defaultCurrency,
  hideNameAtIndex = -1,
}: Props) {
  const t = useTranslations("reservationItemsPreview");
  const locale = useLocale();
  const preview = items.slice(0, 3);

  return (
    <div className={styles.container}>
      {preview.map((item, index) => {
        const cur =
          item.reservation_item.currency || defaultCurrency || "CHF";
        const line = formatMoneyCentsCodeFirst(
          item.reservation_item.unit_price_cents,
          cur,
        );
        const productId =
          item.reservation_item.product_id ?? item.product_id ?? null;
        const hideName = index === hideNameAtIndex;

        const img =
          item.image_url ? (
            <img
              src={item.image_url}
              alt={item.product_name ?? t("alt")}
              className={styles.imageTag}
              loading="lazy"
            />
          ) : (
            <span className={styles.imagePlaceholder} aria-hidden />
          );

        const imageBody =
          productId != null ? (
            <Link
              href={localeHref(locale, `/products/${productId}`)}
              className={styles.imageLink}
              aria-label={t("viewProduct", {
                name: item.product_name ?? t("alt"),
              })}
            >
              {img}
            </Link>
          ) : (
            img
          );

        return (
          <div key={item.reservation_item.id} className={styles.item}>
            <div className={styles.image}>{imageBody}</div>

            <div className={styles.meta}>
              {!hideName && (
                <div className={styles.name}>{item.product_name}</div>
              )}

              {item.variant_text && (
                <div className={styles.variant}>{item.variant_text}</div>
              )}

              <div className={styles.priceRow}>
                <span className={styles.price}>{line}</span>
                <span className={styles.quantity}>
                  {item.reservation_item.quantity}×
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {items.length > 3 && (
        <div className={styles.more}>
          {t("more", { count: String(items.length - 3) })}
        </div>
      )}
    </div>
  );
}
