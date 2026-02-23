"use client";

import { useState } from "react";
import Link from "next/link";

import SearchPill from "../search/SearchPill";
import type { CategoryOption, StoreOption } from "@/../utils/fetchAPI";
import styles from "./AppHeader.module.css";

import AuthModal from "../auth/AuthModal";
import UserMenu from "../auth/UserMenu";
import { CartButton } from "../cart/CartButton";
import { CartPopover } from "../cart/CartPopover";
import { useCart } from "../cart/CartContext";

type Props = {
  categories: CategoryOption[];
  stores: StoreOption[];
};

export default function AppHeader({ categories, stores }: Props) {
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { cart } = useCart();

  const items = cart?.items ?? [];
  const itemCount = items.length;

  // Pick a default store for the SearchPill (first one), if available
  const defaultStore: StoreOption | null = stores?.[0] ?? null;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoTitle}>Luigi&apos;s Bike Rentals</span>
            <span className={styles.logoSubtitle}>Bern, Zurich, Geneva</span>
          </Link>

          <div className={styles.rightActions}>
            <UserMenu onOpenAuth={() => setAuthOpen(true)} />

            <CartButton count={itemCount} onClick={() => setCartOpen((v) => !v)} />

            {cartOpen && <CartPopover onClose={() => setCartOpen(false)} />}

            <button type="button" className={styles.menuButton} aria-label="Open navigation menu">
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        <div className={styles.searchRow}>
          {defaultStore ? (
            <SearchPill
              categories={categories ?? []}
              stores={stores ?? []}
              selectedStore={defaultStore}
              // Optional: only needed if you want header to keep track
              // onStoreChange={(s) => console.log("Selected store:", s)}
            />
          ) : (
            <div className={styles.disabled}>No stores configured yet.</div>
          )}
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}