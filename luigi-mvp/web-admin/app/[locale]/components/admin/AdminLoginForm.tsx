"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import {
  exchangeIdTokenForSessionCookie,
  fetchMe,
  isStaffOrAdminRole,
  logoutSession,
  SHOP_ID,
} from "@/lib/AuthSession";
import { useLocale } from "@/../i18n/useLocale";
import styles from "./AdminLoginForm.module.css";

function clean(s: string) {
  return s.trim();
}

export function AdminLoginForm() {
  const t = useTranslations("admin");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nextPath = searchParams.get("next") ?? `/${locale}/users`;

  const canSubmit = useMemo(() => {
    return clean(email) !== "" && password !== "";
  }, [email, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const eClean = clean(email);
      await signInWithEmailAndPassword(auth, eClean, password);
      await exchangeIdTokenForSessionCookie({ shop_id: SHOP_ID });
      const me = await fetchMe();
      if (!me || !isStaffOrAdminRole(me.role)) {
        setMsg(t("accessDenied"));
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
    } catch {
      setMsg(t("loginError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.wrap} onSubmit={onSubmit}>
      <p className={styles.subtitle}>{t("loginSubtitle")}</p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="admin-email">
          {t("email")}
        </label>
        <input
          id="admin-email"
          className={styles.input}
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="admin-password">
          {t("password")}
        </label>
        <input
          id="admin-password"
          className={styles.input}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
      </div>

      {msg ? (
        <p className={styles.msg} role="alert">
          {msg}
        </p>
      ) : null}

      <button className={styles.primary} type="submit" disabled={!canSubmit || busy}>
        {busy ? t("signingIn") : t("signIn")}
      </button>
    </form>
  );
}
