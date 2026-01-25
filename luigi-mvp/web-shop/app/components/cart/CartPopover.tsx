"use client";

import Link from "next/link";
import styles from "./CartPopover.module.css";
import { useCart } from "./CartContext";

function formatCHF(cents: number) {
  return new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" }).format(cents / 100);
}

export function CartPopover({ onClose }: { onClose: () => void }) {
  const { cart, loading, error, removeItem } = useCart();
  const items = cart?.items ?? [];
  const top = items.slice(0, 5);

  return (
    <div className={styles.pop} role="dialog" aria-label="Cart summary">
      <div className={styles.head}>
        <div className={styles.title}>Cart</div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">×</button>
      </div>

      {loading && <div className={styles.muted}>Loading…</div>}
      {!loading && error && <div className={styles.error}>{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className={styles.muted}>Your cart is empty.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className={styles.list}>
            {top.map((it) => (
              <div key={it.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.rowTitle}>Item #{it.id}</div>
                  <div className={styles.rowMeta}>
                    {new Date(it.start_at).toLocaleDateString("de-CH")} – {new Date(it.end_at).toLocaleDateString("de-CH")}
                  </div>
                </div>

                <div className={styles.rowRight}>
                  <div className={styles.price}>{formatCHF(it.unit_price_cents)}</div>
                  <button
                    type="button"
                    className={styles.trash}
                    onClick={() => void removeItem(it.id)}
                    aria-label="Remove item"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>

          {items.length > 5 && (
            <div className={styles.muted}>+ {items.length - 5} more in cart</div>
          )}

          <div className={styles.footer}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Subtotal</span>
              <span className={styles.totalValue}>{formatCHF(cart?.subtotal_cents ?? 0)}</span>
            </div>

            <Link href="/cart" className={styles.cta} onClick={onClose}>
              View cart
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
