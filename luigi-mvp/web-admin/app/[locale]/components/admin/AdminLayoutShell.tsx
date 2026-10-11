"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import { useLocale } from "@/../i18n/useLocale";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";
import styles from "./AdminShell.module.css";

export function AdminLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const locale = useLocale();
  const { me, loading } = useAdminAuth();
  const isLogin = pathname === `/${locale}/login`;
  const [navOpen, setNavOpen] = useState(false);

  const showChrome = me && !isLogin;

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <div className={styles.appRoot}>
      <AdminTopBar
        showMenuButton={Boolean(showChrome)}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((open) => !open)}
      />
      {loading && !isLogin ? (
        <div className={styles.loadingPane}>…</div>
      ) : showChrome ? (
        <div className={styles.bodyRow}>
          {navOpen ? (
            <button
              type="button"
              className={styles.navBackdrop}
              aria-label="Close menu"
              onClick={() => setNavOpen(false)}
            />
          ) : null}
          <AdminSidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
          <div className={styles.mainPane}>{children}</div>
        </div>
      ) : (
        <div className={styles.fullPane}>{children}</div>
      )}
    </div>
  );
}
