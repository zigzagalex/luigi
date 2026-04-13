"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import { SHOP_ID } from "@/lib/AuthSession";
import { createUser, listUsers, type ApiUser } from "@/lib/usersApi";
import { useLocale } from "@/../i18n/useLocale";
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
  const [busy, setBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [firebaseUid, setFirebaseUid] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");

  const canManage = useMemo(() => isAdminRole(me?.role ?? null), [me?.role]);

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
      } catch (e) {
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

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateMsg(null);
    const uid = firebaseUid.trim();
    if (!uid) {
      setCreateMsg(t("firebaseUidRequired"));
      return;
    }
    setBusy(true);
    try {
      await createUser({
        shop_id: SHOP_ID,
        email: email.trim(),
        firebase_uid: uid,
        display_name: displayName.trim() || undefined,
        role,
      });
      setEmail("");
      setDisplayName("");
      setFirebaseUid("");
      setRole("staff");
      setCreateMsg(t("createSuccess"));
      const data = await listUsers(SHOP_ID);
      setRows(data);
      router.refresh();
    } catch {
      setCreateMsg(t("createError"));
    } finally {
      setBusy(false);
    }
  }

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

      {canManage ? (
        <form className={styles.form} onSubmit={onCreate}>
          <h2 className={styles.h2}>{t("addUser")}</h2>
          <p className={styles.hint}>{t("addUserHint")}</p>
          <div className={styles.grid}>
            <label className={styles.label}>
              {t("email")}
              <input
                className={styles.input}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className={styles.label}>
              {t("displayName")}
              <input
                className={styles.input}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className={styles.label}>
              {t("colUid")} *
              <input
                className={styles.input}
                type="text"
                required
                value={firebaseUid}
                onChange={(e) => setFirebaseUid(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className={styles.label}>
              {t("role")}
              <select
                className={styles.input}
                value={role}
                onChange={(e) => setRole(e.target.value as "staff" | "admin")}
                disabled={busy}
              >
                <option value="staff">{t("roleStaff")}</option>
                <option value="admin">{t("roleAdmin")}</option>
              </select>
            </label>
          </div>
          {createMsg ? <p className={styles.msg}>{createMsg}</p> : null}
          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? t("creating") : t("create")}
          </button>
        </form>
      ) : (
        <p className={styles.readonly}>{t("readOnly")}</p>
      )}

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
              <th>{t("colUid")}</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? [])
              .filter((u) => {
                const r = String(u.role ?? "")
                  .toLowerCase()
                  .trim();
                return r === "admin" || r === "staff";
              })
              .map((u) => (
              <tr key={u.id}>
                <td>{cell(u.email ?? null)}</td>
                <td>{cell(u.display_name ?? null)}</td>
                <td>{cell(u.role ?? null)}</td>
                <td>{u.is_active ? t("yes") : t("no")}</td>
                <td className={styles.mono}>{cell(u.firebase_uid ?? null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
