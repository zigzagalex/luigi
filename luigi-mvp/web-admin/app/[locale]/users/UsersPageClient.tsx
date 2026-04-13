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
  const [createFeedback, setCreateFeedback] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
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
    setCreateFeedback(null);
    setBusy(true);
    try {
      await createUser({
        shop_id: SHOP_ID,
        email: email.trim(),
        password: password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        role,
      });
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setRole("staff");
      setCreateFeedback({ text: t("createSuccess"), ok: true });
      const data = await listUsers(SHOP_ID);
      setRows(data);
      router.refresh();
    } catch {
      setCreateFeedback({ text: t("createError"), ok: false });
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
              {t("firstName")}
              <input
                className={styles.input}
                type="text"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className={styles.label}>
              {t("lastName")}
              <input
                className={styles.input}
                type="text"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className={styles.label}>
              {t("phone")}
              <input
                className={styles.input}
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className={styles.label}>
              {t("email")}
              <input
                className={styles.input}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className={styles.label}>
              {t("newUserPassword")}
              <input
                className={styles.input}
                type="password"
                required
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          {createFeedback ? (
            <p className={createFeedback.ok ? styles.msg : styles.error}>
              {createFeedback.text}
            </p>
          ) : null}
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
