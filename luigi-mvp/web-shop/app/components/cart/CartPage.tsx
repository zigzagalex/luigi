"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";
import styles from "./CartPage.module.css";

export default function CartPage() {
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Your cart</h1>
        <Link href="/" className={styles.continue}>
          Continue shopping
        </Link>
      </header>

      {/* Optional top warning */}
      {blockedItems.length > 0 && (
        <div className={styles.warning}>
          Some items need updated dates before checkout.
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
                  {formatDate(item.start_at)} → {formatDate(item.end_at)}
                </div>
                {blocked && (
                  <div className={styles.blocked}>
                    {blockedLabel(reason)}
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
                  Adjust dates
                </button>

                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove item"
                >
                  🗑 Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <footer className={styles.footer}>
        <div className={styles.subtotal}>
          <span>Subtotal</span>
          <strong>CHF {((cart?.subtotal_cents ?? 0) / 100).toFixed(2)}</strong>
        </div>
        {canCheckout ? (
            <Link href="/checkout" className={styles.checkout}>
              Checkout
            </Link>
          ) : (
            <button className={styles.checkout} disabled>
            Checkout
          </button>
        )}

        {!canCheckout && (
          <div className={styles.checkoutHint}>
            Fix blocked items to continue.
          </div>
        )}
      </footer>
    </div>
  );
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat("de-CH").format(new Date(d));
}

function blockedLabel(reason?: string) {
  switch (reason) {
    case "start_date_in_past":
      return "Start date is in the past — please select new dates.";
    case "not_available":
      return "Not available for the selected dates — please select new dates.";
    default:
      return "This item can’t be checked out — please select new dates.";
  }
}
