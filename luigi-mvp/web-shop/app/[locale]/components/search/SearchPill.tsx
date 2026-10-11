"use client";

import { useState, useRef, useEffect, useMemo, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";
import { RangeCalendar } from "@/[locale]/components/daterangepicker/DateRangePicker";
import { intlLocaleTagForAppLocale } from "@/[locale]/components/daterangepicker/dateFnsLocale";
import { IconSearch } from "@/[locale]/components/icons";
import type { CategoryOption, StoreOption } from "@/../utils/fetchAPI";
import { SHOP_ID } from "@/lib/shopId";
import styles from "./SearchPill.module.css";

type ActivePanel = "what" | "when" | "where" | null;

type SearchPillProps = {
  categories: CategoryOption[];
  stores: StoreOption[];
  selectedStore: StoreOption | null;
  onStoreChange?: (store: StoreOption) => void;
  /** Tighter wrapper when shown inside the compact PDP header */
  embedded?: boolean;
};


function formatDateForApiLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function storeDisplayName(store?: StoreOption | null, fallback = "Choose location") {
  if (!store) return fallback;
  // @ts-expect-error tolerate either shape
  return store.name ?? store.label ?? fallback;
}

export default function SearchPill({
  categories,
  stores,
  selectedStore,
  onStoreChange,
  embedded = false,
}: SearchPillProps) {
  const t = useTranslations("searchPill");
  const appLocale = useLocale();
  const router = useRouter();
  const [active, setActive] = useState<ActivePanel>(null);

  const storeOptions: StoreOption[] = Array.isArray(stores) ? stores : [];

  // ---------- WHAT ----------
  const [categoryOptions] = useState<CategoryOption[]>(() =>
    categories && categories.length > 0 ? categories : [{ id: null, label: t("anyBike") }]
  );
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption | null>(null);
  const whatLabel = selectedCategory?.label ?? t("chooseBikeType");
  const isWhatEmpty = !selectedCategory;

  // ---------- WHEN ----------
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  const whenLabel = useMemo(() => {
    if (!range?.from) return t("addDates");
    const from = range.from;
    const to = range.to ?? range.from;

    const fmt = new Intl.DateTimeFormat(intlLocaleTagForAppLocale(appLocale), {
      day: "2-digit",
      month: "short",
    });

    const fromStr = fmt.format(from);
    const toStr = fmt.format(to);

    if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
      return `${from.getDate()}.–${toStr}`;
    }
    return `${fromStr}–${toStr}`;
  }, [range, appLocale, t]);
  const isWhenEmpty = !range?.from;

  // ---------- WHERE ----------
  const [store, setStore] = useState<StoreOption | null>(() => {
    if (selectedStore?.id) return selectedStore;
    if (stores.length === 1 && stores[0]?.id) return stores[0];
    return null;
  });
  const [gateMessage, setGateMessage] = useState<string | null>(null);

  useEffect(() => {
    setStore((s) => {
      if (s?.id) return s;
      if (selectedStore?.id) return selectedStore;
      if (stores.length === 1 && stores[0]) return stores[0];
      return s;
    });
  }, [selectedStore, stores.length, stores[0]?.id]);

  const whereLabel = storeDisplayName(store, t("chooseLocation"));
  const isWhereEmpty = !store?.id;
  const hasStores = storeOptions.length > 0;

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
      if (!hasStores) {
        setGateMessage(t("noStoresAvailable"));
        return;
      }
      setGateMessage(t("pickLocationFirst"));
      setActive("where");
      return;
    }

    setGateMessage(null);

    const params = new URLSearchParams();
    params.set("shop_id", String(SHOP_ID));
    params.set("store_id", String(store.id));

    if (selectedCategory?.id) params.set("category_id", String(selectedCategory.id));

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
    <div className={`${styles.heroWrapper} ${embedded ? styles.heroWrapperEmbedded : ""}`}>
      {gateMessage ? (
        <p className={styles.gateMessage} role="status" aria-live="polite">
          {gateMessage}
        </p>
      ) : null}
      <div ref={wrapperRef} className={styles.pill}>
        <div ref={pillRef} className={styles.pillInner}>
          {/* WHAT */}
          <button
            ref={whatBtnRef}
            type="button"
            className={`${styles.section} ${active === "what" ? styles.sectionActive : ""}`}
            onClick={() => setActive(active === "what" ? null : "what")}
          >
            <span className={styles.label}>{t("what")}</span>
            <span className={`${styles.value} ${isWhatEmpty ? styles.valueEmpty : ""}`}>{whatLabel}</span>
          </button>

          <div className={styles.divider} />

          {/* WHEN */}
          <button
            ref={whenBtnRef}
            type="button"
            className={`${styles.section} ${active === "when" ? styles.sectionActive : ""}`}
            onClick={() => setActive(active === "when" ? null : "when")}
          >
            <span className={styles.label}>{t("when")}</span>
            <span className={`${styles.value} ${isWhenEmpty ? styles.valueEmpty : ""}`}>{whenLabel}</span>
          </button>

          <div className={styles.divider} />

          {/* WHERE */}
          <button
            ref={whereBtnRef}
            type="button"
            className={`${styles.section} ${active === "where" ? styles.sectionActive : ""}`}
            onClick={() => {
              setGateMessage(null);
              setActive(active === "where" ? null : "where");
            }}
          >
            <span className={styles.label}>{t("where")}</span>
            <span className={`${styles.value} ${isWhereEmpty ? styles.valueEmpty : ""}`}>{whereLabel}</span>
          </button>

          <button
            type="button"
            className={styles.submit}
            onClick={handleSearch}
            disabled={!hasStores}
            aria-label={t("searchAria")}
            title={!hasStores ? t("noStoresAvailable") : undefined}
          >
            <span className={styles.submitIcon} aria-hidden="true">
              <IconSearch focusable={false} aria-hidden />
            </span>
            <span className={styles.submitLabel}>{t("searchAria")}</span>
          </button>

          {/* POPOVER */}
          {active && (
            <div className={styles.popover} style={popoverStyle}>
              {active === "what" && (
                <div className={`${styles.panel} ${styles.whatPanel}`}>
                  <div className={styles.categoryGrid}>
                    {categoryOptions.map((opt) => {
                      const isSelected = opt.id === selectedCategory?.id;
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
                    {!hasStores ? (
                      <p className={styles.whereEmpty}>{t("noStoresAvailable")}</p>
                    ) : null}
                    {storeOptions.map((s) => {
                      const isSelected = s.id === store?.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setStore(s);
                            setGateMessage(null);
                            onStoreChange?.(s);
                            setActive(null);
                          }}
                          className={`${styles.categoryPill} ${isSelected ? styles.categoryPillSelected : ""}`}
                        >
                          {storeDisplayName(s, t("chooseLocation"))}
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