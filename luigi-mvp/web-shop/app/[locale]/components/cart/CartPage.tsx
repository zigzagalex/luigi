"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/[locale]/components/cart/CartContext";
import styles from "./CartPage.module.css";

export default function CartPage() {
  const t = useTranslations("cartPage");
  const locale = useLocale();
  const {
    cart,
    removeItem,
    imageUrlForCartItem,
    productNameForCartItem,
    variantTextForCartItem,
    canCheckout,
    blockedItems,
  } = useCart();

  const items = cart?.items ?? [];
  const store_name = cart?.store_name
  const store_address = cart?.store_address
  const store_postalcode = cart?.store_postalcode
  const store_city = cart?.store_city

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t("title")}</h1>
        <Link href="/" className={styles.continue}>
          {t("continueShopping")}
        </Link>
      </header>

      {/* Optional top warning */}
      {blockedItems.length > 0 && (
        <div className={styles.warning}>
          {t("warningBlocked")}
        </div>
      )}

      {/* Store Info */}
      {store_name && (
        <div className={styles.storeCard}>
          <div className={styles.storeLabel}>{t("pickupLocation")}</div>
          <div className={styles.storeName}>{store_name}</div>
          {(store_address || store_postalcode || store_city) && (
            <div className={styles.storeAddress}>
              {store_address}
              {(store_postalcode || store_city) && (
                <>
                  <br />
                  {store_postalcode} {store_city}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className={styles.items}>
        {items.map((item) => {
          const imageUrl = imageUrlForCartItem(item);
          const name = productNameForCartItem(item);
          const variantLine = variantTextForCartItem(item);

          const blocked = (item as any).blocked === true;
          const reason = (item as any).reason as string | undefined;

          return (
            <div key={item.id} className={`${styles.itemRow} ${blocked ? styles.itemRowBlocked : ""}`}>
              <div className={styles.imageWrap}>
                <img src={imageUrl} alt={name} />
              </div>

              <div className={styles.itemInfo}>
                <div className={styles.title}>{name}</div>
                {variantLine && <div className={styles.variant}>{variantLine}</div>}

                <div className={styles.meta}>
                  {formatDate(item.start_at, locale)} → {formatDate(item.end_at, locale)}
                </div>
                {blocked && (
                  <div className={styles.blocked}>
                    {blockedLabel(reason, t)}
                  </div>
                )}
              </div>

              <div className={styles.itemActions}>
                <div className={styles.price}>
                  CHF {(item.unit_price_cents / 100).toFixed(2)}
                </div>
                <button
                  type="button"
                  className={styles.adjustDates}
                  onClick={() => {
                    // TODO: open date picker modal and call updateItem(...)
                    console.log("Adjust dates for cart item", item.id);
                  }}
                >
                  {t("adjustDates")}
                </button>

                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => removeItem(item.id)}
                  aria-label={t("removeItemAria")}
                >
                  {t("removeItem")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <footer className={styles.footer}>
        <div className={styles.subtotal}>
          <span>{t("subtotal")}</span>
          <strong>CHF {((cart?.subtotal_cents ?? 0) / 100).toFixed(2)}</strong>
        </div>
        {canCheckout ? (
            <Link href="/checkout" className={styles.checkout}>
              {t("checkout")}
            </Link>
          ) : (
            <button className={styles.checkout} disabled>
            {t("checkout")}
          </button>
        )}

        {!canCheckout && (
          <div className={styles.checkoutHint}>
            {t("checkoutHint")}
          </div>
        )}
      </footer>
    </div>
  );
}

function formatDate(d: string, locale: string) {
  return new Intl.DateTimeFormat(locale).format(new Date(d));
}

function blockedLabel(reason: string | undefined, t: ReturnType<typeof useTranslations>) {
  switch (reason) {
    case "start_date_in_past":
      return t("blockedStartPast");
    case "not_available":
      return t("blockedNotAvailable");
    default:
      return t("blockedDefault");
  }
}
