// app/components/layout/AppHeader.tsx
"use client";

import Link from "next/link";
import SearchPill from "../search/SearchPill";

export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        {/* Logo / brand */}
        <Link href="/" className="app-logo">
          <span className="app-logo-title">Luigi&apos;s Bike Rentals</span>
          <span className="app-logo-subtitle">Bern, Zurich, Geneva</span>
        </Link>

        {/* Center search pill */}
        <div className="app-header-search">
          <SearchPill />
        </div>

        {/* Right: kebab / menu icon */}
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
    </header>
  );
}
