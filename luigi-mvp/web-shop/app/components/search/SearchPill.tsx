"use client";

import { useState } from "react";

export default function SearchPill() {
  const [quantity] = useState(1); // UI-only for now

  return (
    <div className="search-hero">
      <div className="search-pill">
        <button type="button" className="search-pill-section">
          <span className="search-pill-label">What</span>
          <span className="search-pill-value">Bike</span>
        </button>

        <div className="search-pill-divider" />

        <button type="button" className="search-pill-section">
          <span className="search-pill-label">When</span>
          <span className="search-pill-value">Add dates</span>
        </button>

        <div className="search-pill-divider" />

        <button type="button" className="search-pill-section">
          <span className="search-pill-label">How many</span>
          <span className="search-pill-value">
            {quantity} bike{quantity > 1 ? "s" : ""}
          </span>
        </button>

        <button type="button" className="search-pill-submit">
          <span className="search-pill-submit-icon">🔍</span>
        </button>
      </div>
    </div>
  );
}
