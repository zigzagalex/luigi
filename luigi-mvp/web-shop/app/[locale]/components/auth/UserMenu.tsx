"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { IconLogout, IconProfile, IconReservations } from "@/[locale]/components/icons";
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const reservationRef = useRef<HTMLAnchorElement | null>(null);
  const profileRef = useRef<HTMLAnchorElement | null>(null);
  const logoutRef = useRef<HTMLButtonElement | null>(null);
  const prevOpen = useRef(false);
  const menuId = useId();

  const firstName = useMemo(() => {
    const dn = me?.display_name?.trim();
    if (!dn) return null;
    return dn.split(/\s+/)[0] ?? null;
  }, [me]);

  const menuItems = useMemo(
    () => [reservationRef, profileRef, logoutRef] as const,
    [],
  );

  useEffect(() => {
    let raf = 0;
    if (!prevOpen.current && open) {
      raf = window.requestAnimationFrame(() => {
        reservationRef.current?.focus();
      });
    } else if (prevOpen.current && !open) {
      triggerRef.current?.focus();
    }
    prevOpen.current = open;
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [open]);

  // close on click outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | PointerEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("pointerdown", onDown);
    };
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

  function focusMenuIndex(index: number) {
    const el = menuItems[index]?.current;
    el?.focus();
  }

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const els = menuItems.map((r) => r.current).filter(Boolean) as HTMLElement[];
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (i < 0) focusMenuIndex(0);
      else focusMenuIndex((i + 1) % els.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (i < 0) focusMenuIndex(els.length - 1);
      else focusMenuIndex((i - 1 + els.length) % els.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusMenuIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusMenuIndex(els.length - 1);
    }
  }

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
          <IconProfile focusable={false} aria-hidden />
        </span>
      </button>
    );
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.button}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        {t("hi", { name: firstName ?? t("there") })}
      </button>

      {open && (
        <div
          id={menuId}
          className={styles.popover}
          role="menu"
          aria-label={t("accountMenuLabel")}
          onKeyDown={onMenuKeyDown}
        >
          <Link
            ref={reservationRef}
            className={styles.item}
            role="menuitem"
            href="/reservations"
            onClick={() => setOpen(false)}
          >
            <span className={styles.itemIcon} aria-hidden>
              <IconReservations className={styles.itemSvg} aria-hidden />
            </span>
            <span className={styles.itemLabel}>{t("reservations")}</span>
          </Link>
          <Link
            ref={profileRef}
            className={styles.item}
            role="menuitem"
            href="/profile"
            onClick={() => setOpen(false)}
          >
            <span className={styles.itemIcon} aria-hidden>
              <IconProfile className={styles.itemSvg} aria-hidden />
            </span>
            <span className={styles.itemLabel}>{t("profileSettings")}</span>
          </Link>
          <div className={styles.divider} role="separator" aria-hidden="true" />
          <button
            ref={logoutRef}
            className={`${styles.item} ${styles.danger}`}
            role="menuitem"
            type="button"
            onClick={async () => {
              setOpen(false);
              await logout();
            }}
          >
            <span className={`${styles.itemIcon} ${styles.dangerIcon}`} aria-hidden>
              <IconLogout className={styles.itemSvg} aria-hidden />
            </span>
            <span className={styles.itemLabel}>{t("logout")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
