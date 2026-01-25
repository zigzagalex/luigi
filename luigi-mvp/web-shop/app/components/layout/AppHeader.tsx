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
  const [selectedStore, setSelectedStore] = useState<StoreOption | null>(() => stores[0] ?? null);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { cart } = useCart();

  const items = cart?.items ?? [];
  const itemCount = items.length;


  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoTitle}>Luigi&apos;s Bike Rentals</span>
            <span className={styles.logoSubtitle}>Bern, Zurich, Geneva</span>
          </Link>

          {stores.length > 0 && (
            <nav className={styles.storeNav} aria-label="Choose pickup location">
              {stores.map((store) => {
                const isActive = selectedStore?.id === store.id;

                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => setSelectedStore(store)}
                    className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
                  >
                    {store.label}
                  </button>
                );
              })}
            </nav>
          )}

          <div className={styles.rightActions}>
            {/* Replaces the old "Log in / Sign up" button */}
            <UserMenu onOpenAuth={() => setAuthOpen(true)} />

            <CartButton  
              count={itemCount}
              onClick={() => setCartOpen((v) => !v)}
            />
            {cartOpen && (
              <CartPopover
                onClose={() => setCartOpen(false)}
              />
            )}

            <button type="button" className={styles.menuButton} aria-label="Open navigation menu">
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        

        <div className={styles.searchRow}>
          {selectedStore ? (
            <SearchPill categories={categories} selectedStore={selectedStore} />
          ) : (
            <div className={styles.disabled}>No stores configured yet.</div>
          )}
        </div>
      </div>

      {/* Keep modal here so it's not trapped inside layout styling */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
