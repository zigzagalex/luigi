"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { IconWarning } from "@/[locale]/components/icons";
import { useCart } from "@/[locale]/components/cart/CartContext";
import styles from "./CartPage.module.css";

export default function CartPage() {
  const t = useTranslations("cartPage");
  const tPd = useTranslations("productDetail");
  const locale = useLocale();
  const {
    cart,
    loading,
    error,
    refresh,
    removeItem,
    imageUrlForCartItem,
    productNameForCartItem,
    variantTextForCartItem,
    canCheckout,
    blockedItems,
  } = useCart();

  const items = cart?.items ?? [];
  const store_name = cart?.store_name;
  const store_address = cart?.store_address;
  const store_postalcode = cart?.store_postalcode;
  const store_city = cart?.store_city;
  const cartCurrency = cart?.currency ?? "CHF";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t("title")}</h1>
        <Link href="/" className={styles.continue}>
          {t("continueShopping")}
        </Link>
      </header>

      {loading ? (
        <CartSkeleton label={t("loadingCart")} />
      ) : error ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorText}>{t("loadError")}</p>
          <button type="button" className={styles.retryBtn} onClick={() => void refresh()}>
            {t("retry")}
          </button>
        </div>
      ) : (
        <>
          {blockedItems.length > 0 && (
            <div className={styles.warning}>
              <span className={styles.warningIconWrap} aria-hidden="true">
                <IconWarning className={styles.warningIcon} width={20} height={20} aria-hidden />
              </span>
              <span className={styles.warningText}>{t("warningBlocked")}</span>
            </div>
          )}

          {items.length > 0 && store_name ? (
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
          ) : null}

          {items.length === 0 ? (
            <div className={styles.empty}>
              <h2 className={styles.emptyTitle}>{t("emptyTitle")}</h2>
              <p className={styles.emptyBody}>{t("emptyBody")}</p>
              <Link href="/" className={styles.emptyCta}>
                {t("continueShopping")}
              </Link>
            </div>
          ) : (
            <div className={styles.items}>
              {items.map((item) => {
                const imageUrl = imageUrlForCartItem(item);
                const name = productNameForCartItem(item);
                const variantLine = variantTextForCartItem(item);
                const blocked = (item as { blocked?: boolean }).blocked === true;
                const reason = (item as { reason?: string }).reason as string | undefined;
                const currency = item.currency || cartCurrency;
                const rentalDays = countRentalDays(item.start_at, item.end_at);
                const qty = (item as { quantity?: number }).quantity;
                const showQty = typeof qty === "number" && qty > 1;

                return (
                  <div
                    key={item.id}
                    className={`${styles.itemRow} ${blocked ? styles.itemRowBlocked : ""}`}
                  >
                    <div className={styles.imageWrap}>
                      <img src={imageUrl} alt="" loading="lazy" />
                    </div>

                    <div className={styles.itemInfo}>
                      <div className={styles.title}>{name}</div>
                      {variantLine ? <div className={styles.variant}>{variantLine}</div> : null}
                      {showQty ? (
                        <div className={styles.quantityLine}>{t("quantityLabel", { count: qty })}</div>
                      ) : null}

                      <div className={styles.dateBlock}>
                        <div className={styles.dateRow}>
                          <span className={styles.dateLabel}>{tPd("dateSummaryInlinePickup")}</span>
                          <span className={styles.dateValue}>{formatDate(item.start_at, locale)}</span>
                        </div>
                        <div className={styles.dateRow}>
                          <span className={styles.dateLabel}>{tPd("dateSummaryInlineReturn")}</span>
                          <span className={styles.dateValue}>{formatDate(item.end_at, locale)}</span>
                        </div>
                      </div>

                      {blocked ? (
                        <div className={styles.blocked}>{blockedLabel(reason, t)}</div>
                      ) : null}
                    </div>

                    <div className={styles.itemActions}>
                      <div className={styles.priceBlock}>
                        <div className={styles.price}>{formatMoney(item.unit_price_cents, locale, currency)}</div>
                        <div className={styles.priceCaption}>{t("linePriceCaption", { days: rentalDays })}</div>
                      </div>

                      <button
                        type="button"
                        className={styles.remove}
                        onClick={() => removeItem(item.id)}
                        aria-label={`${t("removeItemAria")}: ${name}`}
                      >
                        {t("removeItem")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {items.length > 0 ? (
            <footer className={styles.footer}>
              <div className={styles.subtotal}>
                <span>{t("subtotal")}</span>
                <strong>{formatMoney(cart?.subtotal_cents ?? 0, locale, cartCurrency)}</strong>
              </div>
              {canCheckout ? (
                <Link href="/checkout" className={styles.checkout}>
                  {t("checkout")}
                </Link>
              ) : (
                <button type="button" className={styles.checkout} disabled>
                  {t("checkout")}
                </button>
              )}

              {!canCheckout && blockedItems.length > 0 ? (
                <div className={styles.checkoutHint}>{t("checkoutHint")}</div>
              ) : null}
            </footer>
          ) : null}
        </>
      )}
    </div>
  );
}

function CartSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.skeletonWrap} aria-busy="true" aria-live="polite">
      <p className={styles.skeletonStatus}>{label}</p>
      <div className={styles.skeletonList}>
        {[0, 1].map((k) => (
          <div key={k} className={styles.skeletonRow}>
            <div className={styles.skeletonThumb} />
            <div className={styles.skeletonLines}>
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLineShort} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(d: string, locale: string) {
  return new Intl.DateTimeFormat(locale).format(new Date(d));
}

function formatMoney(cents: number, locale: string, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function countRentalDays(startIso: string, endIso: string): number {
  const from = new Date(startIso);
  const to = new Date(endIso);
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  const diff = Math.floor((b - a) / 86400000) + 1;
  return Math.max(1, diff);
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
