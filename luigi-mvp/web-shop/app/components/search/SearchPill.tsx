"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { RangeCalendar } from "@/components/daterangepicker/DateRangePicker";
import type { CategoryOption, StoreOption } from "@/../utils/fetchAPI";
import styles from "./SearchPill.module.css";

type ActivePanel = "what" | "when" | "where" | null;

type SearchPillProps = {
  categories: CategoryOption[];
  stores: StoreOption[];
  selectedStore: StoreOption;
  onStoreChange?: (store: StoreOption) => void;
};

const DEFAULT_SHOP_ID = 1;

function formatDateForApiLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function storeDisplayName(store?: StoreOption | null) {
  if (!store) return "Choose location";
  // @ts-expect-error tolerate either shape
  return store.name ?? store.label ?? "Choose location";
}

export default function SearchPill({ categories, stores, selectedStore, onStoreChange }: SearchPillProps) {
  const router = useRouter();
  const [active, setActive] = useState<ActivePanel>(null);

  const storeOptions: StoreOption[] = Array.isArray(stores) ? stores : [];

  // ---------- WHAT ----------
  const [categoryOptions] = useState<CategoryOption[]>(() =>
    categories && categories.length > 0 ? categories : [{ id: null, label: "Any bike" }]
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

    const fmt = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "short" });

    const fromStr = fmt.format(from);
    const toStr = fmt.format(to);

    if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
      return `${from.getDate()}.–${toStr}`;
    }
    return `${fromStr}–${toStr}`;
  })();

  // ---------- WHERE ----------
  const [store, setStore] = useState<StoreOption | null>(selectedStore ?? null);
  useEffect(() => setStore(selectedStore ?? null), [selectedStore]);

  // refs for anchoring the popover
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const whatBtnRef = useRef<HTMLButtonElement | null>(null);
  const whenBtnRef = useRef<HTMLButtonElement | null>(null);
  const whereBtnRef = useRef<HTMLButtonElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const onChange = () => setIsMobile(mql.matches);
    onChange();

    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }

  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setActive(null);
    }

    if (active) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [active]);

  // compute popover placement
  useEffect(() => {
    if (!active || isMobile) {
      setPopoverPos(null);
      return;
    }

    const pillEl = pillRef.current;
    if (!pillEl) return;

    const pillRect = pillEl.getBoundingClientRect();

    // keep calendar full width (optional). Anchor only WHAT/WHERE.
    if (active === "when") {
      setPopoverPos({ left: 0, width: pillRect.width });
      return;
    }

    const btnEl =
      active === "what" ? whatBtnRef.current : active === "where" ? whereBtnRef.current : null;

    if (!btnEl) return;

    const btnRect = btnEl.getBoundingClientRect();
    let left = btnRect.left - pillRect.left;
    let width = btnRect.width;

    // tiny safety clamp
    left = Math.max(0, Math.min(left, pillRect.width - width));

    setPopoverPos({ left, width });
  }, [active, isMobile]);

  function handleSearch() {
    if (!store?.id) {
      console.error("SearchPill: handleSearch called without a valid store");
      return;
    }

    const params = new URLSearchParams();
    params.set("shop_id", String(DEFAULT_SHOP_ID));
    params.set("store_id", String(store.id));

    if (selectedCategory.id) params.set("category_id", String(selectedCategory.id));

    if (range?.from) {
      params.set("from", formatDateForApiLocal(range.from));
      const toDate = range.to ?? range.from;
      params.set("to", formatDateForApiLocal(toDate));
    }

    params.set("quantity", "1");

    router.push(`/search?${params.toString()}`);
    setActive(null);
  }

  const popoverStyle: CSSProperties | undefined =
    !active || isMobile || !popoverPos ? undefined : { left: popoverPos.left, width: popoverPos.width };

  return (
    <div className={styles.heroWrapper}>
      <div ref={wrapperRef} className={styles.pill}>
        <div ref={pillRef} className={styles.pillInner}>
          {/* WHAT */}
          <button
            ref={whatBtnRef}
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
            ref={whenBtnRef}
            type="button"
            className={`${styles.section} ${active === "when" ? styles.sectionActive : ""}`}
            onClick={() => setActive(active === "when" ? null : "when")}
          >
            <span className={styles.label}>When</span>
            <span className={styles.value}>{whenLabel}</span>
          </button>

          <div className={styles.divider} />

          {/* WHERE */}
          <button
            ref={whereBtnRef}
            type="button"
            className={`${styles.section} ${active === "where" ? styles.sectionActive : ""}`}
            onClick={() => setActive(active === "where" ? null : "where")}
          >
            <span className={styles.label}>Where</span>
            <span className={styles.value}>{storeDisplayName(store)}</span>
          </button>

          <button type="button" className={styles.submit} onClick={handleSearch} aria-label="Search">
            <span className={styles.submitIcon}>🔍</span>
          </button>

          {/* POPOVER */}
          {active && (
            <div className={styles.popover} style={popoverStyle}>
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
                          className={`${styles.categoryPill} ${isSelected ? styles.categoryPillSelected : ""}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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

              {active === "where" && (
                <div className={`${styles.panel} ${styles.wherePanel}`}>
                  <div className={styles.categoryGrid}>
                    {storeOptions.map((s) => {
                      const isSelected = s.id === store?.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setStore(s);
                            onStoreChange?.(s);
                            setActive(null);
                          }}
                          className={`${styles.categoryPill} ${isSelected ? styles.categoryPillSelected : ""}`}
                        >
                          {storeDisplayName(s)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}