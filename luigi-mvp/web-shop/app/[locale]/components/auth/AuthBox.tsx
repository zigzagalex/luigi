"use client";

import { useMemo, useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { exchangeIdTokenForSessionCookie } from "@/lib/AuthSession";
import PhoneField from "./PhoneField";
import styles from "./AuthBox.module.css";
import { useAuth } from "@/[locale]/components/auth/AuthContext";

type Mode = "login" | "signup";

const SHOP_ID = 1;

function clean(s: string) {
  return s.trim();
}

export function AuthBox() {
  const [mode, setMode] = useState<Mode>("login");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { refresh } = useAuth();

  const canSubmit = useMemo(() => {
    const e = clean(email);
    const p = password; 
    if (!e || !p) return false;

    if (mode === "login") return true;

    return (
      clean(firstName) !== "" &&
      clean(lastName) !== "" &&
      clean(phone) !== "" &&
      phoneValid
    );
  }, [mode, email, password, firstName, lastName, phone, phoneValid]);

  async function run(fn: () => Promise<void>) {
    setMsg(null);
    setBusy(true);
    try {
      await fn();
      setMsg("Success. Session cookie set.");
    } catch (e: any) {
      setMsg(e?.message ?? "Something failed.");
    } finally {
      setBusy(false);
    }
  }

  async function doLogin() {
    const e = clean(email);
    if (!e || !password) throw new Error("Email + password required.");

    await signInWithEmailAndPassword(auth, e, password);
    await exchangeIdTokenForSessionCookie({ shop_id: SHOP_ID });
    await refresh();
  }

  async function doSignup() {
    const fn = clean(firstName);
    const ln = clean(lastName);
    const ph = clean(phone);
    const e = clean(email);

    if (!fn || !ln || !ph) throw new Error("First name, last name, and phone are required.");
    if (!phoneValid) throw new Error("That phone number is not valid.");
    if (!e || !password) throw new Error("Email + password required.");

    await createUserWithEmailAndPassword(auth, e, password);
    await exchangeIdTokenForSessionCookie({
      shop_id: SHOP_ID,
      first_name: fn,
      last_name: ln,
      phone: ph,
    });
    await refresh();
  }

  return (
    <div className={styles.wrap}>
      {/* Mode switch */}
      <div className={styles.actions}>
        <button
          type="button"
          className={mode === "login" ? styles.primary : styles.secondary}
          disabled={busy}
          onClick={() => {
            setMode("login");
            setMsg(null);
          }}
        >
          Log in
        </button>

        <button
          type="button"
          className={mode === "signup" ? styles.primary : styles.secondary}
          disabled={busy}
          onClick={() => {
            setMode("signup");
            setMsg(null);
          }}
        >
          Sign up
        </button>
      </div>

      {mode === "signup" && (
        <>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-first">First name</label>
            <input
              id="auth-first"
              className={styles.input}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              disabled={busy}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-last">Last name</label>
            <input
              id="auth-last"
              className={styles.input}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              disabled={busy}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Phone</label>
            <PhoneField
              value={phone}
              onChange={setPhone}
              defaultCountry="CH"
              onValidityChange={setPhoneValid}
            />
          </div>
        </>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          className={styles.input}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          disabled={busy}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          className={styles.input}
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          disabled={busy}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          disabled={busy || !canSubmit}
          onClick={() => run(mode === "login" ? doLogin : doSignup)}
        >
          {mode === "login" ? "Log in" : "Create account"}
        </button>
      </div>

      {msg && <p className={styles.msg}>{msg}</p>}
    </div>
  );
}
