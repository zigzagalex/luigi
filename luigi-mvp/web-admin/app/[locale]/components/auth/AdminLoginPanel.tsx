"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import {
  exchangeIdTokenForSessionCookie,
  isStaffOrAdminRole,
  logoutSession,
  SHOP_ID,
} from "@/lib/AuthSession";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import { useLocale } from "@/../i18n/useLocale";
import styles from "./AdminLoginPanel.module.css";

function clean(s: string) {
  return s.trim();
}

export function AdminLoginPanel() {
  const t = useTranslations("authModal");
  const ta = useTranslations("admin");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const { refresh } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const nextPath = searchParams.get("next") ?? `/${locale}/users`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setStatus("");
    setBusy(true);
    try {
      const eMail = clean(email);
      if (!eMail || !password) {
        setStatus(t("emailPasswordRequired"));
        return;
      }

      await signInWithEmailAndPassword(auth, eMail, password);
      await exchangeIdTokenForSessionCookie({ shop_id: SHOP_ID });
      const me = await refresh();
      if (!me || !isStaffOrAdminRole(me.role)) {
        setStatus(ta("accessDenied"));
        try {
          await logoutSession(SHOP_ID);
        } catch {
          /* ignore */
        }
        await auth.signOut();
        return;
      }

      router.replace(nextPath.startsWith("/") ? nextPath : `/${locale}${nextPath}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("somethingWentWrong");
      setStatus(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t("welcomeBack")}</h1>
        <p className={styles.subtitle}>{ta("loginCardSubtitle")}</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label htmlFor="admin-login-email" className={styles.field}>
            <span className={styles.label}>{t("emailAddress")}</span>
            <input
              id="admin-login-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={busy}
              name="email"
            />
          </label>

          <label htmlFor="admin-login-password" className={styles.field}>
            <span className={styles.label}>{t("password")}</span>
            <input
              id="admin-login-password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
              name="password"
            />
          </label>

          <div className={styles.rowBetween}>
            <span />
            <button
              type="button"
              className={styles.link}
              onClick={() => setStatus(t("forgotPasswordTodo"))}
              disabled={busy}
            >
              {t("forgotPassword")}
            </button>
          </div>

          <button className={styles.primary} type="submit" disabled={busy}>
            {t("login")}
          </button>

          {status ? (
            <div
              className={`${styles.status} ${status === ta("accessDenied") ? styles.statusError : ""}`}
            >
              {status}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
