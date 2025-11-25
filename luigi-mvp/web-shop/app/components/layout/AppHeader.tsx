// app/components/layout/AppHeader.tsx
"use client";

import Link from "next/link";
import SearchPill from "../search/SearchPill";

export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        {/* Top row: logo + menu (like Airbnb nav bar) */}
        <div className="app-header-top">
          <Link href="/" className="app-logo">
            <span className="app-logo-title">Luigi&apos;s Bike Rentals</span>
            <span className="app-logo-subtitle">Bern, Zurich, Geneva</span>
          </Link>

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

        {/* Second row: search pill, same header, below nav */}
        <div className="app-header-search-row">
          <SearchPill />
        </div>
      </div>
    </header>
  );
}
