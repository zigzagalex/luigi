"use client";

import Link from "next/link";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import type { Accessory } from "@/../utils/accessories";
import AccessoryCard from "./AccessoryCard";
import ScrollCue from "../products/ScrollCue";
import styles from "../products/CategoryRow.module.css";

type Props = {
  accessories: Accessory[];
  /** e.g. `/en/accessories` */
  viewAllHref: string;
};

export default function AccessoryRow({ accessories, viewAllHref }: Props) {
  const tRow = useTranslations("categoryRow");
  const tTitle = useTranslations("accessoryPage");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  if (!accessories.length) return null;

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    const amount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className={styles.row}>
      <div className={styles.header}>
        <h2 className={styles.title}>{tTitle("title")}</h2>
        <Link href={viewAllHref} className={styles.viewAll}>
          {tRow("viewAll")}
        </Link>
      </div>

      <div className={styles.body}>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowLeft}`}
          onClick={() => scroll("left")}
          aria-label={tRow("scrollLeft")}
        >
          ‹
        </button>

        <div
          ref={scrollRef}
          className={
            accessories.length > 1
              ? `${styles.scroll} ${styles.scrollPeek}`
              : styles.scroll
          }
        >
          {accessories.map((a) => (
            <div key={a.id} className={styles.item}>
              <AccessoryCard accessory={a} />
            </div>
          ))}
        </div>

        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowRight}`}
          onClick={() => scroll("right")}
          aria-label={tRow("scrollRight")}
        >
          ›
        </button>
      </div>
      <ScrollCue scrollRef={scrollRef} itemCount={accessories.length} />
    </section>
  );
}
