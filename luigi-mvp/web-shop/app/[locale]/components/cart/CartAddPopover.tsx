"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/[locale]/components/cart/CartContext";
import type { CartUpsellAccessoryItem } from "@/../utils/cartAccessoryUpsell";
import styles from "./CartAddPopover.module.css";

/** Upsell payload returned by GET /api/cart-accessory-upsell (mirrors API JSON). */
type UpsellProduct = NonNullable<CartUpsellAccessoryItem["product"]>;

export function CartAddPopover() {
    const t = useTranslations("cartAddPopover");
    const router = useRouter();
    const locale = useLocale();

    const { shopId, isAddPopoverOpen, lastAdded, closeAddPopover } = useCart();

    const [upsellRows, setUpsellRows] = useState<CartUpsellAccessoryItem[] | null>(
        null,
    );

    const handleContinueShopping = useCallback(() => {
        closeAddPopover();
    }, [closeAddPopover]);

    const handleGoToCart = useCallback(() => {
        closeAddPopover();
        router.push(`/${locale}/cart`);
    }, [closeAddPopover, router, locale]);

    const handleSeeAccessories = useCallback(() => {
        closeAddPopover();
        router.push(`/${locale}/accessories`);
    }, [closeAddPopover, router, locale]);

    const handleBackdropMouseDown = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
          if (e.target === e.currentTarget) closeAddPopover();
        },
        [closeAddPopover]
    );

    useEffect(() => {
        if (!isAddPopoverOpen) return;
    
        const onKeyDown = (e: KeyboardEvent) => {
          if (e.key === "Escape") closeAddPopover();
        };
    
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isAddPopoverOpen, closeAddPopover]);

    useEffect(() => {
        if (!isAddPopoverOpen || !lastAdded?.suggestAccessories) {
            setUpsellRows(null);
            return;
        }
        let cancelled = false;
        setUpsellRows(null);
        void (async () => {
            try {
                const qs = new URLSearchParams({
                    shop_id: String(shopId),
                    locale,
                });
                const res = await fetch(`/api/cart-accessory-upsell?${qs.toString()}`);
                if (!res.ok) {
                    if (!cancelled) setUpsellRows([]);
                    return;
                }
                const rows = (await res.json()) as CartUpsellAccessoryItem[];
                if (!cancelled) setUpsellRows(rows);
            } catch {
                if (!cancelled) setUpsellRows([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isAddPopoverOpen, lastAdded?.suggestAccessories, shopId, locale]);

    if (!isAddPopoverOpen) return null;

    // Fallback UI if state is open but lastAdded is missing
    const title = lastAdded?.title ?? t("fallbackTitle");
    const imageUrl = lastAdded?.imageUrl;
    const subtitleParts = [
        lastAdded?.storeName ? t("pickup", { value: lastAdded.storeName }) : null,
        lastAdded?.from && lastAdded?.to ? t("dates", { from: lastAdded.from, to: lastAdded.to }) : null,
        typeof lastAdded?.quantity === "number" ? t("qty", { count: String(lastAdded.quantity) }) : null,
    ].filter(Boolean);

    const showUpsell =
        !!lastAdded?.suggestAccessories && upsellRows && upsellRows.some((r) => r.product);

    const categoryLabel = (slug: CartUpsellAccessoryItem["categorySlug"]) => {
        if (slug === "acc-helmets") return t("upsellCategoryHelmet");
        if (slug === "acc-navigation") return t("upsellCategoryNavigation");
        return t("upsellCategoryShoes");
    };

    const renderUpsellCard = (product: UpsellProduct) => (
        <Link
            key={product.id}
            href={`/${locale}/accessories/${product.id}`}
            className={styles.upsellCard}
            onClick={closeAddPopover}
        >
            {product.primary_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={product.primary_image_url}
                    alt=""
                    className={styles.upsellThumb}
                />
            ) : (
                <div className={styles.upsellThumb} />
            )}
            <div className={styles.upsellName}>{product.name}</div>
        </Link>
    );

    return (
        <div
          className={styles.backdrop}
          role="presentation"
          onMouseDown={handleBackdropMouseDown}
        >
          <div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label={t("ariaLabel")}
          >
            <div className={styles.header}>
              <div className={styles.headerTitle}>{t("title")}</div>
              <button
                type="button"
                className={styles.close}
                onClick={handleContinueShopping}
                aria-label={t("closeAria")}
              >
                ✕
              </button>
            </div>
    
            <div className={styles.body}>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className={styles.thumb} />
              ) : (
                <div className={styles.thumbPlaceholder} />
              )}
    
              <div className={styles.meta}>
                <div className={styles.title}>{title}</div>
    
                {subtitleParts.length > 0 && (
                  <div className={styles.subtitle}>
                    {subtitleParts.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                )}
    
                {lastAdded?.priceLabel && (
                  <div className={styles.price}>{lastAdded.priceLabel}</div>
                )}
              </div>
            </div>

            {lastAdded?.suggestAccessories ? (
              <div className={styles.upsellSection}>
                <div className={styles.upsellHeading}>{t("upsellHeading")}</div>
                {showUpsell ? (
                  <div className={styles.upsellGrid} role="list">
                    {upsellRows!.map((row) =>
                      row.product ? (
                        <div key={row.categorySlug} className={styles.upsellCell} role="listitem">
                          <div className={styles.upsellCategory}>
                            {categoryLabel(row.categorySlug)}
                          </div>
                          {renderUpsellCard(row.product)}
                        </div>
                      ) : null,
                    )}
                  </div>
                ) : null}
                <button
                  type="button"
                  className={styles.upsellCta}
                  onClick={handleSeeAccessories}
                >
                  {t("seeAccessories")}
                </button>
              </div>
            ) : null}
    
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondary}
                onClick={handleContinueShopping}
              >
                {t("continueShopping")}
              </button>
    
              <button
                type="button"
                className={styles.primary}
                onClick={handleGoToCart}
              >
                {t("goToCart")}
              </button>
            </div>
          </div>
        </div>
    );
}
    
