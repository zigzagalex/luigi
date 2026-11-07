"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { localeHref } from "@/../i18n/localeHref";
import type { Accessory } from "@/../utils/accessories";
import styles from "./AccessoryCard.module.css";

type Props = {
  accessory: Accessory;
};

export default function AccessoryCard({ accessory }: Props) {
  const t = useTranslations("accessoryCard");
  const locale = useLocale();
  const imageUrl = accessory.primary_image_url || null;
  return (
    <Link href={localeHref(locale, `/accessories/${accessory.id}`)} className={styles.card}>
      <div className={styles.imageWrapper}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={accessory.name}
            className={styles.image}
            loading="lazy"
          />
        ) : null}
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{accessory.name}</h3>
        {accessory.description ? (
          <p className={styles.description}>{accessory.description}</p>
        ) : null}
        <span className={styles.cta}>{t("viewDetails")}</span>
      </div>
    </Link>
  );
}
