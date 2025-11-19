"use client";

import { useState, useRef, useEffect } from "react";

type ActivePanel = "what" | "when" | "howMany" | null;

export default function SearchPill() {
  const [active, setActive] = useState<ActivePanel>(null);
  const [what, setWhat] = useState<string>("Any bike");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setActive(null);
      }
    }
    if (active) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [active]);

  return (
    <div className="hero-wrapper">
      <div ref={wrapperRef} className="search-pill">
        <button
          type="button"
          className={`search-pill-section ${
            active === "what" ? "search-pill-section-active" : ""
          }`}
          onClick={() => setActive(active === "what" ? null : "what")}
        >
          <span className="search-pill-label">What</span>
          <span className="search-pill-value">{what}</span>
        </button>

        <div className="search-pill-divider" />

        <button
          type="button"
          className={`search-pill-section ${
            active === "when" ? "search-pill-section-active" : ""
          }`}
          onClick={() => setActive(active === "when" ? null : "when")}
        >
          <span className="search-pill-label">When</span>
          <span className="search-pill-value">
            {startDate && endDate ? `${startDate} → ${endDate}` : "Add dates"}
          </span>
        </button>

        <div className="search-pill-divider" />

        <button
          type="button"
          className={`search-pill-section ${
            active === "howMany" ? "search-pill-section-active" : ""
          }`}
          onClick={() => setActive(active === "howMany" ? null : "howMany")}
        >
          <span className="search-pill-label">How many</span>
          <span className="search-pill-value">
            {quantity} bike{quantity > 1 ? "s" : ""}
          </span>
        </button>

        <button type="button" className="search-pill-submit">
          <span className="search-pill-submit-icon">🔍</span>
        </button>

        {active && (
          <div className="search-popover">
            {active === "what" && (
              <div className="search-popover-content">
                <h4>Bike type</h4>
                <input
                  type="text"
                  className="search-input"
                  placeholder="City, e-bike, cargo..."
                  value={what === "Any bike" ? "" : what}
                  onChange={(e) =>
                    setWhat(e.target.value || "Any bike")
                  }
                />
                <p className="search-help">
                  This is UI-only for now, we’ll wire it to filters later.
                </p>
              </div>
            )}

            {active === "when" && (
              <div className="search-popover-content search-popover-dates">
                <div>
                  <label>From</label>
                  <input
                    type="date"
                    className="search-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label>To</label>
                  <input
                    type="date"
                    className="search-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {active === "howMany" && (
              <div className="search-popover-content search-popover-quantity">
                <div className="quantity-row">
                  <span>Bikes</span>
                  <div className="quantity-controls">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.max(1, q - 1))
                      }
                    >
                      −
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
