"use client";

import { useEffect, useState, type RefObject } from "react";
import styles from "./ScrollCue.module.css";

const THUMB_RATIO = 0.38;

type Props = {
  scrollRef: RefObject<HTMLDivElement | null>;
  itemCount: number;
};

export default function ScrollCue({ scrollRef, itemCount }: Props) {
  const [motion, setMotion] = useState({ left: 0, visible: itemCount > 1 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || itemCount < 2) return;

    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const visible = max > 8;
      const left = visible ? (el.scrollLeft / max) * (1 - THUMB_RATIO) : 0;
      setMotion((prev) => {
        if (prev.visible === visible && Math.abs(prev.left - left) < 0.004) {
          return prev;
        }
        return { left, visible };
      });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [scrollRef, itemCount]);

  if (itemCount < 2) return null;

  return (
    <div className={styles.cue} aria-hidden="true">
      {motion.visible ? (
        <div className={styles.track}>
          <div
            className={styles.thumb}
            style={{ width: `${THUMB_RATIO * 100}%`, left: `${motion.left * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
