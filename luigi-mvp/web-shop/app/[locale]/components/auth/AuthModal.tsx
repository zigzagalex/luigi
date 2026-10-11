"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { loginSession, registerSession, SHOP_ID } from "@/lib/AuthSession";
import PhoneField from "./PhoneField";
import styles from "./AuthModal.module.css";
import { useAuth } from "@/[locale]/components/auth/AuthContext";

type Mode = "login" | "signup";

type Props = {
  open: boolean;
  onClose: () => void;
};

function clean(s: string) {
  return s.trim();
}

export default function AuthModal({ open, onClose }: Props) {
  const t = useTranslations("authModal");
  const [mode, setMode] = useState<Mode>("login");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const { onLoginSuccess } = useAuth();

  useEffect(() => setStatus(""), [open, mode]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const title = useMemo(
    () => (mode === "login" ? t("welcomeBack") : t("createAccountTitle")),
    [mode, t]
  );
  const subtitle = useMemo(
    () => (mode === "login" ? t("loginSubtitle") : t("signupSubtitle")),
    [mode, t]
  );

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setStatus("");
    setBusy(true);

    try {
      const eMail = clean(email);

      if (mode === "login") {
        if (!eMail || !password) {
          setStatus(t("emailPasswordRequired"));
          return;
        }

        await loginSession(eMail, password);
        setStatus(t("loginSuccess"));
        await onLoginSuccess();
        onClose();
        return;
      }

      const fn = clean(firstName);
      const ln = clean(lastName);
      const ph = clean(phone);

      if (!fn || !ln || !ph || !eMail || !password) {
        setStatus(t("fillAllFields"));
        return;
      }

      if (!phoneValid) {
        setStatus(t("invalidPhone"));
        return;
      }

      await registerSession({
        email: eMail,
        password,
        shop_id: SHOP_ID,
        first_name: fn,
        last_name: ln,
        phone: ph,
      });

      setStatus(t("signupSuccess"));
      await onLoginSuccess();
      onClose();
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : t("somethingWentWrong"));
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("");
    setPassword("");

    if (next === "login") {
      setFirstName("");
      setLastName("");
      setPhone("");
      setPhoneValid(false);
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose} role="presentation">
      <div
        className={styles.modal}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        aria-describedby="auth-subtitle"
      >
        <button className={styles.close} type="button" onClick={onClose} aria-label={t("closeAria")} disabled={busy}>
          ×
        </button>

        <h2 id="auth-title" className={styles.title}>
          {title}
        </h2>
        <p id="auth-subtitle" className={styles.subtitle}>
          {subtitle}
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {mode === "signup" && (
            <>
              <div className={styles.twoCol}>
                <label htmlFor="first_name" className={styles.field}>
                  <span className={styles.label}>{t("firstName")}</span>
                  <input
                    ref={firstFieldRef}
                    className={styles.input}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    disabled={busy}
                    id="first_name"
                    name="first_name"
                  />
                </label>

                <label htmlFor="last_name" className={styles.field}>
                  <span className={styles.label}>{t("lastName")}</span>
                  <input
                    className={styles.input}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    disabled={busy}
                    id="last_name"
                    name="last_name"
                  />
                </label>
              </div>

              <label htmlFor="phone" className={styles.field}>
                <span className={styles.label}>{t("phoneNumber")}</span>
                <PhoneField
                  value={phone}
                  onChange={setPhone}
                  defaultCountry="CH"
                  onValidityChange={setPhoneValid}
                />
              </label>
            </>
          )}

          <label htmlFor="email" className={styles.field}>
            <span className={styles.label}>{t("emailAddress")}</span>
            <input
              ref={mode === "login" ? firstFieldRef : undefined}
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={busy}
              id="email"
              name="email"
            />
          </label>

          <label htmlFor="password" className={styles.field}>
            <span className={styles.label}>{t("password")}</span>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              disabled={busy}
              id="password"
              name="password"
            />
          </label>

          {mode === "login" && (
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
          )}

          <button className={styles.primary} type="submit" disabled={busy}>
            {mode === "login" ? t("login") : t("createAccount")}
          </button>

          <div className={styles.switchRow}>
            {mode === "login" ? (
              <>
                <span>{t("dontHaveAccount")}</span>
                <button type="button" className={styles.link} onClick={() => switchMode("signup")} disabled={busy}>
                  {t("createAccount")}
                </button>
              </>
            ) : (
              <>
                <span>{t("alreadyHaveAccount")}</span>
                <button type="button" className={styles.link} onClick={() => switchMode("login")} disabled={busy}>
                  {t("login")}
                </button>
              </>
            )}
          </div>

          {status && <div className={styles.status}>{status}</div>}
        </form>
      </div>
    </div>
  );
}
