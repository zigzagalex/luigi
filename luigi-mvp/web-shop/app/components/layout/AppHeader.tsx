// app/components/layout/AppHeader.tsx
import Link from "next/link";
import SearchPill from "../search/SearchPill";
import { fetchCategoryOptions } from "utils/fetchAPI";

const DEFAULT_SHOP_ID = 1;

export default async function AppHeader() {
  const categories = await fetchCategoryOptions(DEFAULT_SHOP_ID);

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
          <SearchPill categories={categories} />
        </div>
      </div>
    </header>
  );
}
