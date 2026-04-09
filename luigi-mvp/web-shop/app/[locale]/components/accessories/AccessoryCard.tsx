"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Accessory } from "@/../utils/accessories";
import styles from "./AccessoryCard.module.css";

type Props = {
  accessory: Accessory;
};

const FALLBACK_IMAGE =
  "https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=800";

export default function AccessoryCard({ accessory }: Props) {
  const t = useTranslations("accessoryCard");
  return (
    <Link href={`/accessories/${accessory.id}`} className={styles.card}>
      <div className={styles.imageWrapper}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FALLBACK_IMAGE}
          alt={accessory.name}
          className={styles.image}
          loading="lazy"
        />
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
