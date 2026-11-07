"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { formatRentalDateRange } from "@/lib/formatRentalRange";
import { int64OrNull } from "@/lib/nulls";
import { IconTrash } from "@/[locale]/components/icons";
import { localeHref } from "@/../i18n/localeHref";
import { useCart } from "./CartContext";
import styles from "./CartPopover.module.css";

type Props = { onClose: () => void };

export function CartPopover({ onClose }: Props) {
  const t = useTranslations("cartPopover");
  const locale = useLocale();
  const {
    cart,
    removeItem,
    imageUrlForCartItem,
    productNameForCartItem,
    variantTextForCartItem,
  } = useCart();

  const items = cart?.items ?? [];
  const visibleItems = items.slice(0, 5);
  const pickupPlace = cart?.store_city?.trim() || "";
  const pickupLine = pickupPlace ? t("pickup", { location: pickupPlace }) : null;

  return (
    <div className={styles.pop}>
      {/* Header */}
      <div className={styles.head}>
        <div className={styles.title}>{t("title")}</div>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label={t("closeAria")}
        >
          ×
        </button>
      </div>

      {/* Body */}
      {visibleItems.length === 0 ? (
        <div className={styles.muted}>{t("empty")}</div>
      ) : (
        <div className={styles.list}>
          {visibleItems.map((item) => {
            const imageUrl = imageUrlForCartItem(item);
            const name = productNameForCartItem(item);
            const variantLine = variantTextForCartItem(item);

            const qty = Math.max(1, Number(item.quantity ?? 1));
            const productId = int64OrNull(item.product_id);
            const productHref = productId != null ? `/products/${productId}` : null;

            const details = (
              <>
                <div className={styles.thumbWrap}>
                  {imageUrl ? <img src={imageUrl} alt={productHref ? "" : name} /> : null}
                </div>
                <div className={styles.rowDetails}>
                  <div className={styles.rowTitle}>{name}</div>
                  {variantLine && <div className={styles.rowSub}>{variantLine}</div>}
                  <div className={`${styles.rowMeta} ${styles.rowDateRange}`}>
                    {formatRentalDateRange(item.start_at, item.end_at, locale)}
                  </div>
                  {pickupLine && <div className={styles.rowMeta}>{pickupLine}</div>}
                </div>
              </>
            );

            return (
              <div key={item.id} className={styles.row}>
                {productHref ? (
                  <Link
                    href={productHref}
                    className={styles.productLink}
                    aria-label={t("productLinkAria", { product: name })}
                    onClick={onClose}
                  >
                    {details}
                  </Link>
                ) : (
                  <div className={styles.productLinkStatic}>{details}</div>
                )}

                <div className={styles.rowTrash}>
                  <button
                    type="button"
                    className={styles.trash}
                    onClick={() => removeItem(item.id)}
                    aria-label={t("removeItemAria")}
                  >
                    <IconTrash className={styles.trashIcon} aria-hidden />
                  </button>
                </div>

                <div className={styles.rowFooter}>
                  <div className={styles.rowActions}>
                    {qty > 1 && (
                      <span className={styles.qty} aria-label={t("quantityAria", { count: qty })}>
                        ×{qty}
                      </span>
                    )}
                    <span className={styles.price}>
                      CHF {(item.unit_price_cents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {items.length > 0 && (
        <div className={styles.footer}>
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>{t("subtotal")}</span>
            <strong className={styles.totalValue}>
              CHF {((cart?.subtotal_cents ?? 0) / 100).toFixed(2)}
            </strong>
          </div>

          <Link href={localeHref(locale, "/cart")} className={styles.cta} onClick={onClose}>
            {t("viewCart")}
          </Link>
        </div>
      )}
    </div>
  );
}
