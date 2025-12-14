// app/components/search/SearchPill.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import type { DateRange } from "react-day-picker";
import { RangeCalendar } from "@/components/daterangepicker/DateRangePicker";
import type { CategoryOption } from "../../../utils/fetchAPI"; 

type ActivePanel = "what" | "when" | "howMany" | null;

type SearchPillProps = {
  categories: CategoryOption[];
};

export default function SearchPill({ categories }: SearchPillProps) {
  const [active, setActive] = useState<ActivePanel>(null);

  // ---------- WHAT ----------
  const [categoryOptions] = useState<CategoryOption[]>(() =>
    categories && categories.length > 0
      ? categories
      : [{ id: null, label: "Any bike" }]
  );

  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>(
    () => categoryOptions[0] ?? { id: null, label: "Any bike" }
  );

  // ---------- WHEN ----------
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  const whenLabel = (() => {
    if (!range || !range.from) return "Add dates";
    const from = range.from;
    const to = range.to ?? range.from;

    const fmt = new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "short",
    });

    const fromStr = fmt.format(from);
    const toStr = fmt.format(to);

    if (
      from.getMonth() === to.getMonth() &&
      from.getFullYear() === to.getFullYear()
    ) {
      return `${from.getDate()}.–${toStr}`;
    }
    return `${fromStr}–${toStr}`;
  })();

  // ---------- HOW MANY ----------
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
        {/* WHAT */}
        <button
          type="button"
          className={`search-pill-section ${
            active === "what" ? "search-pill-section-active" : ""
          }`}
          onClick={() => setActive(active === "what" ? null : "what")}
        >
          <span className="search-pill-label">What</span>
          <span className="search-pill-value">{selectedCategory.label}</span>
        </button>

        <div className="search-pill-divider" />

        {/* WHEN */}
        <button
          type="button"
          className={`search-pill-section ${
            active === "when" ? "search-pill-section-active" : ""
          }`}
          onClick={() => setActive(active === "when" ? null : "when")}
        >
          <span className="search-pill-label">When</span>
          <span className="search-pill-value">{whenLabel}</span>
        </button>

        <div className="search-pill-divider" />

        {/* HOW MANY */}
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

        {/* POPOVERS */}
        {active && (
          <div className="search-popover">
            {/* WHAT */}
            {active === "what" && (
              <div className="search-popover-content search-popover-what">
                <div className="category-grid">
                  {categoryOptions.map((opt) => {
                    const isSelected = opt.id === selectedCategory.id;
                    return (
                      <button
                        key={opt.id ?? "any"}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(opt);
                          setActive(null);
                        }}
                        className={[
                          "category-pill",
                          isSelected ? "category-pill-selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WHEN */}
            {active === "when" && (
              <div className="search-popover-content search-popover-dates">
                <RangeCalendar
                  value={{
                    from: range?.from,
                    to: range?.to,
                  }}
                  onChange={(val) =>
                    setRange(
                      val.from || val.to
                        ? {
                            from: val.from ?? undefined,
                            to: val.to ?? undefined,
                          }
                        : undefined
                    )
                  }
                />
              </div>
            )}

            {/* HOW MANY */}
            {active === "howMany" && (
              <div className="search-popover-content search-popover-quantity">
                <div className="quantity-row">
                  <div className="quantity-labels">
                    <span className="quantity-title">
                      How many bikes do you want to rent?
                    </span>
                    <span className="quantity-subtitle">
                      Up to {Math.max(quantity, 8)} per booking
                    </span>
                  </div>

                  <div className="quantity-controls">
                    <button
                      type="button"
                      className="quantity-btn"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <span className="quantity-value">{quantity}</span>
                    <button
                      type="button"
                      className="quantity-btn"
                      onClick={() => setQuantity((q) => Math.min(20, q + 1))}
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
