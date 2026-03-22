"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { formatRentalDateRange } from "@/lib/formatRentalRange";
import { int64OrNull } from "@/lib/nulls";
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
                  <img src={imageUrl} alt={productHref ? "" : name} />
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
                    <svg
                      className={styles.trashIcon}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
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

          <Link href="/cart" className={styles.cta} onClick={onClose}>
            {t("viewCart")}
          </Link>
        </div>
      )}
    </div>
  );
}
