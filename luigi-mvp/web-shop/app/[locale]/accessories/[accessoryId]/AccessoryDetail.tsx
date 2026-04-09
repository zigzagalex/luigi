"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocale, useTranslations } from "next-intl";
import type { Accessory, AccessoryInventoryItem, Store } from "@/../utils/accessories";
import styles from "../../products/[productId]/ProductDetail.module.css";

type AccessoryImage = {
  id: number;
  url: string;
  is_primary: boolean;
  sort_order: number;
  alt_text?: string | null;
};

type AccessoryVariantWithImages = {
  id: number;
  product_id: number;
  label: string;
  attributes: Record<string, unknown> | null;
  is_active: boolean | null;
  images: AccessoryImage[];
};

type Props = {
  accessory: Accessory;
  variants: AccessoryVariantWithImages[];
  stores: Store[];
  inventory: AccessoryInventoryItem[];
};

const FALLBACK_IMAGE =
  "https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=1200";

export default function AccessoryDetail({ accessory, variants, stores, inventory }: Props) {
  const t = useTranslations("accessoryDetail");
  const locale = useLocale();
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(variants[0]?.id ?? null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(stores[0]?.id ?? null);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0],
    [variants, selectedVariantId],
  );
  const detailsMarkdown = useMemo(
    () => (accessory.detailed_description ?? "").replace(/\\n/g, "\n"),
    [accessory.detailed_description],
  );

  const images = selectedVariant?.images ?? [];
  const imageURL = images[selectedImageIndex]?.url ?? FALLBACK_IMAGE;

  const availabilityMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of inventory) {
      if (item.is_active === false) continue;
      if (item.status && item.status !== "active") continue;
      const key = `${item.product_variant_id}:${item.store_id}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [inventory]);

  const availableCount = selectedVariant && selectedStoreId
    ? availabilityMap.get(`${selectedVariant.id}:${selectedStoreId}`) ?? 0
    : 0;

  return (
    <div className={styles.inner}>
      <div className={styles.pdpNav}>
        <Link href={`/${locale}/accessories`} className={styles.backLink}>
          {t("backToAccessories")}
        </Link>
        <nav aria-label={t("breadcrumbAria")} className={styles.breadcrumbNav}>
          <ol className={styles.breadcrumbList}>
            <li className={styles.breadcrumbItem}>
              <Link href={`/${locale}`}>{t("breadcrumbHome")}</Link>
            </li>
            <li className={styles.breadcrumbSep} aria-hidden="true">
              /
            </li>
            <li className={styles.breadcrumbItem}>
              <Link href={`/${locale}/accessories`}>{t("breadcrumbAccessories")}</Link>
            </li>
            <li className={styles.breadcrumbSep} aria-hidden="true">
              /
            </li>
            <li className={styles.breadcrumbItem}>
              <span className={styles.breadcrumbCurrent} aria-current="page">
                {accessory.name}
              </span>
            </li>
          </ol>
        </nav>
      </div>

      <div className={styles.layout}>
        <div className={styles.mediaColumn}>
          <section>
            <div className={styles.mainImageWrapper}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageURL}
                alt={images[selectedImageIndex]?.alt_text || accessory.name}
                className={styles.mainImage}
                draggable={false}
              />
            </div>
            {images.length > 1 ? (
              <div className={styles.thumbs}>
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    className={`${styles.thumbBtn} ${idx === selectedImageIndex ? styles.thumbBtnActive : ""}`}
                    onClick={() => setSelectedImageIndex(idx)}
                    aria-label={t("thumbnail", { index: String(idx + 1), total: String(images.length) })}
                    aria-current={idx === selectedImageIndex ? "true" : undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className={styles.thumbImg} draggable={false} />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <div className={styles.belowMedia}>
            <details className={styles.contentDetails} open>
              <summary className={styles.contentDetailsSummary}>{t("detailsTitle")}</summary>
              <div className={styles.contentDetailsBody}>
                {detailsMarkdown ? (
                  <div className={styles.markdownContent}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {detailsMarkdown}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p>{t("detailsFallback")}</p>
                )}
              </div>
            </details>
          </div>
        </div>

        <aside className={`${styles.sidebar} ${styles.sidebarCommerce}`}>
          <header className={styles.header}>
            <h1 className={styles.title}>{accessory.name}</h1>
            {accessory.description ? (
              <p className={styles.headerDescription}>{accessory.description}</p>
            ) : null}
          </header>

          <div className={styles.block}>
            <h2 className={styles.blockTitle}>{t("variant")}</h2>
            <div className={styles.chipRow}>
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                  className={[styles.chip, variant.id === selectedVariant?.id ? styles.chipSelected : ""].join(" ")}
                onClick={() => {
                  setSelectedVariantId(variant.id);
                  setSelectedImageIndex(0);
                }}
              >
                {variant.label}
              </button>
            ))}
            </div>
          </div>

          <div className={styles.block}>
            <h2 className={styles.blockTitle}>{t("pickupLocation")}</h2>
            <div className={styles.storeSegmented}>
              {stores.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  className={`${styles.storeSegment} ${store.id === selectedStoreId ? styles.storeSegmentSelected : ""}`}
                  onClick={() => setSelectedStoreId(store.id)}
                >
                  <span className={styles.storeSegmentLabel}>{store.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.block}>
            <p className={styles.heroPriceMain}>
              {t("availableNow", { count: String(availableCount) })}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
