"use client";

import { useEffect, useRef, useState } from "react";
import { CartButton } from "./CartButton";
import { CartPopover } from "./CartPopover";
import { useCart } from "./CartContext";
import styles from "./CartWidget.module.css";

export function CartWidget() {
  const { itemCount } = useCart();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = wrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <CartButton count={itemCount} onClick={() => setOpen((v) => !v)} />
      {open && <CartPopover onClose={() => setOpen(false)} />}
    </div>
  );
}
