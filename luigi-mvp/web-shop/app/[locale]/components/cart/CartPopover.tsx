"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
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

            return (
              <div key={item.id} className={styles.row}>
                <div className={styles.thumbWrap}>
                  <img src={imageUrl} alt={name} />
                </div>

                <div className={styles.rowMain}>
                  <div className={styles.rowTitle}>{name}</div>
                  {variantLine && <div className={styles.rowSub}>{variantLine}</div>}
                  <div className={styles.rowMeta}>
                    {formatDate(item.start_at, locale)} → {formatDate(item.end_at, locale)}
                  </div>
                </div>

                <div className={styles.rowRight}>
                  <div className={styles.price}>
                    CHF {(item.unit_price_cents / 100).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    className={styles.trash}
                    onClick={() => removeItem(item.id)}
                    aria-label={t("removeItemAria")}
                  >
                    🗑
                  </button>
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

function formatDate(d: string, locale: string) {
  return new Intl.DateTimeFormat(locale).format(new Date(d));
}
