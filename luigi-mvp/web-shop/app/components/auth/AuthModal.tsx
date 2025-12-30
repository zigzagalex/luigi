"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AuthModal.module.css";

type Mode = "login" | "signup";

type Props = {
  open: boolean;
  onClose: () => void;

  // optional: you can wire these later
  onLogin?: (input: { email: string; password: string }) => Promise<void> | void;
  onSignup?: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<void> | void;
};

export default function AuthModal({ open, onClose, onLogin, onSignup }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [status, setStatus] = useState<string>("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // Reset status when opening / switching mode
  useEffect(() => setStatus(""), [open, mode]);

  // Focus first field when opened (basic modal UX)
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, mode]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const title = useMemo(() => {
    return mode === "login" ? "WELCOME BACK." : "CREATE YOUR ACCOUNT.";
  }, [mode]);

  const subtitle = useMemo(() => {
    return mode === "login"
      ? "Log in for faster checkout and easy trip management."
      : "Create an account in a few clicks. You can always change details later.";
  }, [mode]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");

    try {
      if (mode === "login") {
        if (!email || !password) {
          setStatus("Please enter email + password.");
          return;
        }
        await onLogin?.({ email, password });
        setStatus("Looks good. (Wire backend later.)");
        return;
      }

      // signup
      if (!firstName || !lastName || !email || !password) {
        setStatus("Please fill in all fields.");
        return;
      }
      await onSignup?.({ firstName, lastName, email, password });
      setStatus("Account details captured. (Wire backend later.)");
    } catch (err: any) {
      setStatus(err?.message ?? "Something went wrong.");
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("");
    // keep email if you want; I’m clearing password because it’s polite
    setPassword("");
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
        <button className={styles.close} type="button" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 id="auth-title" className={styles.title}>
          {title}
        </h2>
        <p id="auth-subtitle" className={styles.subtitle}>
          {subtitle}
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className={styles.twoCol}>
              <label className={styles.field}>
                <span className={styles.label}>First name</span>
                <input
                  ref={firstFieldRef}
                  className={styles.input}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Last name</span>
                <input
                  className={styles.input}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </label>
            </div>
          )}

          <label className={styles.field}>
            <span className={styles.label}>Email address</span>
            <input
              ref={mode === "login" ? firstFieldRef : undefined}
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Password</span>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {mode === "login" && (
            <div className={styles.rowBetween}>
              <span />
              <button
                type="button"
                className={styles.link}
                onClick={() => setStatus("Forgot password: TODO")}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button className={styles.primary} type="submit">
            {mode === "login" ? "Log in" : "Create account"}
          </button>

          <div className={styles.switchRow}>
            {mode === "login" ? (
              <>
                <span>Don’t have an account?</span>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => switchMode("signup")}
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                <span>Already have an account?</span>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => switchMode("login")}
                >
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
