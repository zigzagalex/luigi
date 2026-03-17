"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "./AuthContext";
import styles from "./UserMenu.module.css";

type Props = {
  onOpenAuth: () => void;
};

export default function UserMenu({ onOpenAuth }: Props) {
  const t = useTranslations("auth");
  const { me, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const firstName = useMemo(() => {
    const dn = me?.display_name?.trim();
    if (!dn) return null;
    return dn.split(/\s+/)[0] ?? null;
  }, [me]);

  // close on click outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (loading) {
    return (
      <button className={styles.button} type="button" disabled>
        …
      </button>
    );
  }

  if (!me) {
    return (
      <button
        className={styles.button}
        type="button"
        onClick={onOpenAuth}
        aria-label={t("loginSignup")}
      >
        <span className={styles.desktopLabel}>{t("loginSignup")}</span>
        <span className={styles.mobileIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
            <path
              d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2ZM5 20a7 7 0 0 1 14 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.button}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {t("hi", { name: firstName ?? t("there") })}
      </button>

      {open && (
        <div className={styles.popover} role="menu" aria-label={t("accountMenuLabel")}>
          <Link className={styles.item} role="menuitem" href="/reservations" onClick={() => setOpen(false)}>
            {t("reservations")}
          </Link>
          <Link className={styles.item} role="menuitem" href="/profile" onClick={() => setOpen(false)}>
            {t("profileSettings")}
          </Link>
          <button
            className={`${styles.item} ${styles.danger}`}
            role="menuitem"
            type="button"
            onClick={async () => {
              setOpen(false);
              await logout();
            }}
          >
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
