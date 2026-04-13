"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import { SHOP_ID } from "@/lib/AuthSession";
import { listUsers, type ApiUser } from "@/lib/usersApi";
import { useLocale } from "@/../i18n/useLocale";
import { CreateUserPanel } from "./CreateUserPanel";
import styles from "./users.module.css";

function isAdminRole(role: string | null | undefined) {
  return (role ?? "").toLowerCase().trim() === "admin";
}

function cell(v: string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  return v;
}

export function UsersPageClient() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const { me, loading } = useAdminAuth();

  const [rows, setRows] = useState<ApiUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canManage = useMemo(() => isAdminRole(me?.role ?? null), [me?.role]);

  const reloadUsers = useCallback(async () => {
    const data = await listUsers(SHOP_ID);
    setRows(data);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!me) {
      router.replace(`/${locale}/login?next=/${locale}/users`);
    }
  }, [loading, me, locale, router]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await listUsers(SHOP_ID);
        if (!cancelled) {
          setRows(data);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError(t("loadError"));
          setRows(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me, t]);

  if (loading || !me) {
    return (
      <main className={styles.main}>
        <p className={styles.muted}>…</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.h1}>{t("usersTitle")}</h1>
        <p className={styles.sub}>{t("usersSubtitle")}</p>
      </div>

      {canManage ? <CreateUserPanel onUserCreated={reloadUsers} /> : <p className={styles.readonly}>{t("readOnly")}</p>}

      {loadError ? (
        <p className={styles.error} role="alert">
          {loadError}
        </p>
      ) : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("colEmail")}</th>
              <th>{t("colName")}</th>
              <th>{t("colRole")}</th>
              <th>{t("colActive")}</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((u) => (
              <tr key={u.id}>
                <td>{cell(u.email ?? null)}</td>
                <td>{cell(u.display_name ?? null)}</td>
                <td>{cell(u.role ?? null)}</td>
                <td>{u.is_active ? t("yes") : t("no")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
