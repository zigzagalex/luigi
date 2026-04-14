"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import { SHOP_ID } from "@/lib/AuthSession";
import { listUsers, updateUser, type ApiUser } from "@/lib/usersApi";
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
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editActive, setEditActive] = useState(true);

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

  async function saveUserChanges(userId: number) {
    if (!canManage) return;
    setSavingUserId(userId);
    setLoadError(null);
    try {
      await updateUser(userId, {
        display_name: clean(editName),
        email: clean(editEmail),
        phone: clean(editPhone),
        is_active: editActive,
      });
      await reloadUsers();
      setEditingUserId(null);
    } catch (err) {
      setLoadError(err instanceof Error && err.message ? err.message : t("updateError"));
    } finally {
      setSavingUserId(null);
    }
  }

  function startEditing(u: ApiUser) {
    setEditingUserId(u.id);
    setEditName(u.display_name ?? "");
    setEditEmail(u.email ?? "");
    setEditPhone(u.phone ?? "");
    setEditActive(Boolean(u.is_active));
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
              <th>{t("colPhone")}</th>
              <th>{t("colRole")}</th>
              <th>{t("colActive")}</th>
              {canManage ? <th>{t("colActions")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((u) => (
              <tr key={u.id}>
                <td>
                  {editingUserId === u.id ? (
                    <input
                      className={styles.inlineInput}
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      disabled={savingUserId === u.id}
                    />
                  ) : (
                    cell(u.email ?? null)
                  )}
                </td>
                <td>
                  {editingUserId === u.id ? (
                    <input
                      className={styles.inlineInput}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={savingUserId === u.id}
                    />
                  ) : (
                    cell(u.display_name ?? null)
                  )}
                </td>
                <td>
                  {editingUserId === u.id ? (
                    <input
                      className={styles.inlineInput}
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      disabled={savingUserId === u.id}
                    />
                  ) : (
                    cell(u.phone ?? null)
                  )}
                </td>
                <td>{cell(u.role ?? null)}</td>
                <td>
                  {editingUserId === u.id ? (
                    <label className={styles.activeToggle}>
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                        disabled={savingUserId === u.id}
                      />
                      <span>{editActive ? t("yes") : t("no")}</span>
                    </label>
                  ) : u.is_active ? (
                    t("yes")
                  ) : (
                    t("no")
                  )}
                </td>
                {canManage ? (
                  <td>
                    {editingUserId === u.id ? (
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => void saveUserChanges(u.id)}
                          disabled={savingUserId === u.id}
                        >
                          {savingUserId === u.id ? t("saving") : t("save")}
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => setEditingUserId(null)}
                          disabled={savingUserId === u.id}
                        >
                          {t("cancel")}
                        </button>
                      </div>
                    ) : (
                      <button type="button" className={styles.actionBtn} onClick={() => startEditing(u)}>
                        {t("edit")}
                      </button>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function clean(value: string) {
  return value.trim();
}
