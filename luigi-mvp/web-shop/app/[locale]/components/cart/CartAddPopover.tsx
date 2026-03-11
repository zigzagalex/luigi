"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCart } from "@/[locale]/components/cart/CartContext";
import styles from "./CartAddPopover.module.css";


export function CartAddPopover() {
    const t = useTranslations("cartAddPopover");
    const router = useRouter();

    const { isAddPopoverOpen, lastAdded, closeAddPopover } = useCart();

    const handleContinueShopping = useCallback(() => {
        closeAddPopover();
    }, [closeAddPopover]);

    const handleGoToCart = useCallback(() => {
        closeAddPopover();
        router.push("/cart");
    }, [closeAddPopover, router]);

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

    if (!isAddPopoverOpen) return null;

    // Fallback UI if state is open but lastAdded is missing
    const title = lastAdded?.title ?? t("fallbackTitle");
    const imageUrl = lastAdded?.imageUrl;
    const subtitleParts = [
        lastAdded?.storeName ? t("pickup", { value: lastAdded.storeName }) : null,
        lastAdded?.from && lastAdded?.to ? t("dates", { from: lastAdded.from, to: lastAdded.to }) : null,
        typeof lastAdded?.quantity === "number" ? t("qty", { count: String(lastAdded.quantity) }) : null,
    ].filter(Boolean);

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
                    {subtitleParts.map((t, i) => (
                      <div key={i}>{t}</div>
                    ))}
                  </div>
                )}
    
                {lastAdded?.priceLabel && (
                  <div className={styles.price}>{lastAdded.priceLabel}</div>
                )}
              </div>
            </div>
    
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
    
