"use client";

import type { ReactNode } from "react";
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

  const showChrome = me && !isLogin;

  return (
    <div className={styles.appRoot}>
      <AdminTopBar />
      {loading && !isLogin ? (
        <div className={styles.loadingPane}>…</div>
      ) : showChrome ? (
        <div className={styles.bodyRow}>
          <AdminSidebar />
          <div className={styles.mainPane}>{children}</div>
        </div>
      ) : (
        <div className={styles.fullPane}>{children}</div>
      )}
    </div>
  );
}
