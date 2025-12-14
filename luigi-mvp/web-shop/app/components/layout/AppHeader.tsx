// app/components/layout/AppHeader.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import SearchPill from "../search/SearchPill";
import type { CategoryOption, StoreOption } from "@/../utils/fetchAPI";

type Props = {
  categories: CategoryOption[];
  stores: StoreOption[];
};

export default function AppHeader({ categories, stores }: Props) {
  const [selectedStore, setSelectedStore] = useState<StoreOption | null>(
    () => stores[0] ?? null // preselect first store
  );

  return (
    <header className="app-header">
      <div className="app-header-inner">
        {/* Top row: logo + store tabs + menu */}
        <div className="app-header-top">
          <Link href="/" className="app-logo">
            <span className="app-logo-title">Luigi&apos;s Bike Rentals</span>
            <span className="app-logo-subtitle">Bern, Zurich, Geneva</span>
          </Link>

          {/* Store tabs */}
          {stores.length > 0 && (
            <nav
              className="app-header-store-nav"
              aria-label="Choose pickup location"
            >
              {stores.map((store) => {
                const isActive = selectedStore?.id === store.id;
                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => setSelectedStore(store)}
                    className={[
                      "store-tab",
                      isActive ? "store-tab-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {store.label}
                  </button>
                );
              })}
            </nav>
          )}

          <button
            type="button"
            className="app-header-menu"
            aria-label="Open navigation menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {/* Second row: search pill */}
        <div className="app-header-search-row">
          {selectedStore ? (
            <SearchPill
              categories={categories}
              selectedStore={selectedStore} // required
            />
          ) : (
            <div className="search-pill-disabled">
              No stores configured yet.
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
