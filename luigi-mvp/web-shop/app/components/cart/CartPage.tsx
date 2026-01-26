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

      <div className={styles.items}>
        {items.map((item) => {
          const imageUrl = imageUrlForCartItem(item);
          const name = productNameForCartItem(item);
          const variantLine = variantTextForCartItem(item);

          return (
            <div key={item.id} className={styles.itemRow}>
              <div className={styles.imageWrap}>
                <img src={imageUrl} alt={name} />
              </div>

              <div className={styles.itemInfo}>
                <div className={styles.title}>{name}</div>
                {variantLine && <div className={styles.variant}>{variantLine}</div>}
                <div className={styles.meta}>
                  {formatDate(item.start_at)} → {formatDate(item.end_at)}
                </div>
              </div>

              <div className={styles.itemActions}>
                <div className={styles.price}>
                  CHF {(item.unit_price_cents / 100).toFixed(2)}
                </div>
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
        <button className={styles.checkout}>Checkout (later)</button>
      </footer>
    </div>
  );
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat("de-CH").format(new Date(d));
}
