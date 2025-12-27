"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { RangeCalendar } from "@/components/daterangepicker/DateRangePicker";
import type { CategoryOption, StoreOption } from "@/../utils/fetchAPI";
import styles from "./SearchPill.module.css";

type ActivePanel = "what" | "when" | "howMany" | null;

type SearchPillProps = {
  categories: CategoryOption[];
  selectedStore: StoreOption;
};

const DEFAULT_SHOP_ID = 1;

function formatDateForApi(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function SearchPill({ categories, selectedStore }: SearchPillProps) {
  const router = useRouter();
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
    if (!range?.from) return "Add dates";
    const from = range.from;
    const to = range.to ?? range.from;

    const fmt = new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "short",
    });

    const fromStr = fmt.format(from);
    const toStr = fmt.format(to);

    if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
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
      if (!wrapperRef.current.contains(e.target as Node)) setActive(null);
    }

    if (active) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [active]);

  function handleSearch() {
    if (!selectedStore?.id) {
      console.error("SearchPill: handleSearch called without a valid selectedStore");
      return;
    }

    const params = new URLSearchParams();
    params.set("shop_id", String(DEFAULT_SHOP_ID));
    params.set("store_id", String(selectedStore.id));

    if (selectedCategory.id) params.set("category_id", String(selectedCategory.id));

    if (range?.from) {
      params.set("from", formatDateForApi(range.from));
      const toDate = range.to ?? range.from;
      params.set("to", formatDateForApi(toDate));
    }

    params.set("quantity", String(quantity));

    router.push(`/search?${params.toString()}`);
    setActive(null);
  }

  return (
    <div className={styles.heroWrapper}>
      <div ref={wrapperRef} className={styles.pill}>
        {/* WHAT */}
        <button
          type="button"
          className={`${styles.section} ${active === "what" ? styles.sectionActive : ""}`}
          onClick={() => setActive(active === "what" ? null : "what")}
        >
          <span className={styles.label}>What</span>
          <span className={styles.value}>{selectedCategory.label}</span>
        </button>

        <div className={styles.divider} />

        {/* WHEN */}
        <button
          type="button"
          className={`${styles.section} ${active === "when" ? styles.sectionActive : ""}`}
          onClick={() => setActive(active === "when" ? null : "when")}
        >
          <span className={styles.label}>When</span>
          <span className={styles.value}>{whenLabel}</span>
        </button>

        <div className={styles.divider} />

        {/* HOW MANY */}
        <button
          type="button"
          className={`${styles.section} ${active === "howMany" ? styles.sectionActive : ""}`}
          onClick={() => setActive(active === "howMany" ? null : "howMany")}
        >
          <span className={styles.label}>How many</span>
          <span className={styles.value}>
            {quantity} bike{quantity > 1 ? "s" : ""}
          </span>
        </button>

        <button type="button" className={styles.submit} onClick={handleSearch} aria-label="Search">
          <span className={styles.submitIcon}>🔍</span>
        </button>

        {/* POPOVERS */}
        {active && (
          <div className={styles.popover}>
            {/* WHAT */}
            {active === "what" && (
              <div className={`${styles.panel} ${styles.whatPanel}`}>
                <div className={styles.categoryGrid}>
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
                        className={`${styles.categoryPill} ${
                          isSelected ? styles.categoryPillSelected : ""
                        }`}
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
              <div className={`${styles.panel} ${styles.datesPanel}`}>
                <RangeCalendar
                  value={{ from: range?.from, to: range?.to }}
                  onChange={(val) =>
                    setRange(
                      val.from || val.to
                        ? { from: val.from ?? undefined, to: val.to ?? undefined }
                        : undefined
                    )
                  }
                />
              </div>
            )}

            {/* HOW MANY */}
            {active === "howMany" && (
              <div className={`${styles.panel} ${styles.quantityPanel}`}>
                <div className={styles.quantityRow}>
                  <div className={styles.quantityLabels}>
                    <span className={styles.quantityTitle}>How many bikes do you want to rent?</span>
                    <span className={styles.quantitySubtitle}>
                      Up to {Math.max(quantity, 8)} per booking
                    </span>
                  </div>

                  <div className={styles.quantityControls}>
                    <button
                      type="button"
                      className={styles.quantityBtn}
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>

                    <span className={styles.quantityValue}>{quantity}</span>

                    <button
                      type="button"
                      className={styles.quantityBtn}
                      onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                      aria-label="Increase quantity"
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
