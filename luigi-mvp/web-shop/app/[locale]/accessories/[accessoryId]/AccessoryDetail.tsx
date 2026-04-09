"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "next-intl";
import type { Accessory, AccessoryInventoryItem, Store } from "@/../utils/accessories";
import styles from "./AccessoryDetail.module.css";

type AccessoryImage = {
  id: number;
  url: string;
  is_primary: boolean;
  sort_order: number;
  alt_text?: string | null;
};

type AccessoryVariantWithImages = {
  id: number;
  accessory_id: number;
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
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(variants[0]?.id ?? null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(stores[0]?.id ?? null);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0],
    [variants, selectedVariantId],
  );

  const images = selectedVariant?.images ?? [];
  const imageURL = images[selectedImageIndex]?.url ?? FALLBACK_IMAGE;

  const availabilityMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of inventory) {
      if (item.is_active === false) continue;
      if (item.status && item.status !== "active") continue;
      const key = `${item.accessory_variant_id}:${item.store_id}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [inventory]);

  const availableCount = selectedVariant && selectedStoreId
    ? availabilityMap.get(`${selectedVariant.id}:${selectedStoreId}`) ?? 0
    : 0;

  return (
    <div className={styles.inner}>
      <section className={styles.media}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageURL}
          alt={images[selectedImageIndex]?.alt_text || accessory.name}
          className={styles.mainImage}
        />
        {images.length > 1 ? (
          <div className={styles.thumbs}>
            {images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                className={[styles.thumb, idx === selectedImageIndex ? styles.thumbActive : ""].join(" ")}
                onClick={() => setSelectedImageIndex(idx)}
                aria-label={t("thumbnail", { index: String(idx + 1), total: String(images.length) })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className={styles.thumbImg} />
              </button>
            ))}
          </div>
        ) : null}
        {accessory.detailed_description ? (
          <div className={styles.markdown}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {accessory.detailed_description}
            </ReactMarkdown>
          </div>
        ) : null}
      </section>

      <aside className={styles.sidebar}>
        <h1 className={styles.title}>{accessory.name}</h1>
        {accessory.description ? <p className={styles.description}>{accessory.description}</p> : null}

        <div>
          <h2 className={styles.blockTitle}>{t("variant")}</h2>
          <div className={styles.options}>
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                className={[styles.chip, variant.id === selectedVariant?.id ? styles.chipActive : ""].join(" ")}
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

        <div>
          <h2 className={styles.blockTitle}>{t("pickupLocation")}</h2>
          <div className={styles.options}>
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                className={[styles.chip, store.id === selectedStoreId ? styles.chipActive : ""].join(" ")}
                onClick={() => setSelectedStoreId(store.id)}
              >
                {store.name}
              </button>
            ))}
          </div>
        </div>

        <p className={styles.meta}>
          {t("availableNow", { count: String(availableCount) })}
        </p>
      </aside>
    </div>
  );
}
