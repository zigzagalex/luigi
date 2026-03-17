// app/[locale]/components/layout/AppHeader.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import SearchPill from "../search/SearchPill";
import type { CategoryOption, StoreOption } from "@/../utils/fetchAPI";
import styles from "./AppHeader.module.css";

import AuthModal from "../auth/AuthModal";
import UserMenu from "../auth/UserMenu";
import { CartButton } from "../cart/CartButton";
import { CartPopover } from "../cart/CartPopover";
import { useCart } from "../cart/CartContext";

import { useLocale } from "@/../i18n/useLocale";
import LocaleSwitcher from "../i18n/LocaleSwitcher";

type Props = {
  categories: CategoryOption[];
  stores: StoreOption[];
};

export default function AppHeader({ categories, stores }: Props) {
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { cart } = useCart();

  const tHeader = useTranslations("header");
  const locale = useLocale();

  const items = cart?.items ?? [];
  const itemCount = items.length;

  const defaultStore: StoreOption | null = stores?.[0] ?? null;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          <Link href={`/${locale}`} className={styles.logo}>
            <span className={styles.logoTitle}>{tHeader("title")}</span>
          </Link>

          <div className={styles.rightActions}>
            <div className={styles.utilityZone}>
              <div className={styles.utilityGroup}>
                <UserMenu onOpenAuth={() => setAuthOpen(true)} />
                <LocaleSwitcher />
              </div>

              <div className={styles.utilityGroup}>
                <div className={styles.cartWrap}>
                  <CartButton
                    count={itemCount}
                    onClick={() => setCartOpen((v) => !v)}
                  />
                  {cartOpen && <CartPopover onClose={() => setCartOpen(false)} />}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.heroZone}>
          <h1 className={styles.heroTitle}>{tHeader("heroCta")}</h1>
          <p className={styles.heroSubtitle}>{tHeader("heroSubtext")}</p>
        </div>

        <div className={styles.searchRow}>
          {defaultStore ? (
            <SearchPill
              categories={categories ?? []}
              stores={stores ?? []}
              selectedStore={defaultStore}
            />
          ) : (
            <div className={styles.disabled}>
              {tHeader("noStoresConfigured")}
            </div>
          )}
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}