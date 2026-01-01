"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { exchangeIdTokenForSessionCookie } from "@/lib/AuthSession";
import PhoneField from "./PhoneField";
import styles from "./AuthModal.module.css";
import { useAuth } from "@/components/auth/AuthContext";

type Mode = "login" | "signup";

const SHOP_ID = 1;

type Props = {
  open: boolean;
  onClose: () => void;

  onLogin?: (input: { email: string; password: string }) => Promise<void> | void;
  onSignup?: (input: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    password: string;
  }) => Promise<void> | void;
};

function clean(s: string) {
  return s.trim();
}

export default function AuthModal({ open, onClose, onLogin, onSignup }: Props) {
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

  const { refresh } = useAuth();

  useEffect(() => setStatus(""), [open, mode]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const title = useMemo(() => (mode === "login" ? "WELCOME BACK." : "CREATE YOUR ACCOUNT."), [mode]);
  const subtitle = useMemo(
    () =>
      mode === "login"
        ? "Log in for faster checkout and easy trip management."
        : "Create an account in a few clicks. You can always change details later.",
    [mode]
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
          setStatus("Please enter email + password.");
          return;
        }

        if (onLogin) await onLogin({ email: eMail, password });
        else await signInWithEmailAndPassword(auth, eMail, password);

        await exchangeIdTokenForSessionCookie({ shop_id: SHOP_ID });

        setStatus("Success. Session cookie set.");
        await refresh();
        onClose();
        return;
      }

      // signup
      const fn = clean(firstName);
      const ln = clean(lastName);
      const ph = clean(phone);

      if (!fn || !ln || !ph || !eMail || !password) {
        setStatus("Please fill in all fields.");
        return;
      }

      if (!phoneValid) {
        setStatus("That phone number is not valid.");
        return;
      }

      if (onSignup) await onSignup({ firstName: fn, lastName: ln, phone: ph, email: eMail, password });
      else await createUserWithEmailAndPassword(auth, eMail, password);

      await exchangeIdTokenForSessionCookie({
        shop_id: SHOP_ID,
        first_name: fn,
        last_name: ln,
        phone: ph,
      });

      setStatus("Success. Account created & session cookie set.");
      await refresh();
      onClose();
    } catch (err: any) {
      setStatus(err?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("");
    setPassword("");

    // optional cleanup: don’t drag signup junk into login and vice versa
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
        <button className={styles.close} type="button" onClick={onClose} aria-label="Close" disabled={busy}>
          ×
        </button>

        <h2 id="auth-title" className={styles.title}>{title}</h2>
        <p id="auth-subtitle" className={styles.subtitle}>{subtitle}</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {mode === "signup" && (
            <>
              <div className={styles.twoCol}>
                <label htmlFor="first_name" className={styles.field}>
                  <span className={styles.label}>First name</span>
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
                  <span className={styles.label}>Last name</span>
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
                <span className={styles.label}>Phone number</span>
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
            <span className={styles.label}>Email address</span>
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
            <span className={styles.label}>Password</span>
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
                onClick={() => setStatus("Forgot password: TODO")}
                disabled={busy}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button className={styles.primary} type="submit" disabled={busy}>
            {mode === "login" ? "Log in" : "Create account"}
          </button>

          <div className={styles.switchRow}>
            {mode === "login" ? (
              <>
                <span>Don’t have an account?</span>
                <button type="button" className={styles.link} onClick={() => switchMode("signup")} disabled={busy}>
                  Create account
                </button>
              </>
            ) : (
              <>
                <span>Already have an account?</span>
                <button type="button" className={styles.link} onClick={() => switchMode("login")} disabled={busy}>
                  Log in
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
