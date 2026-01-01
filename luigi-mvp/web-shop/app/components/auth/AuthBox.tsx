"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { exchangeIdTokenForSessionCookie } from "@/lib/AuthSession";
import styles from "./AuthBox.module.css";

const SHOP_ID = 1;

export function AuthBox() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    await signInWithEmailAndPassword(auth, email, password);
    await exchangeIdTokenForSessionCookie({ shopId: SHOP_ID });
  }

  async function doSignup() {
    if (!firstName || !lastName || !phone) {
      throw new Error("First name, last name, and phone are required for signup.");
    }
    await createUserWithEmailAndPassword(auth, email, password);
    await exchangeIdTokenForSessionCookie({
      shopId: SHOP_ID,
      firstName,
      lastName,
      phone,
    });
  }

  return (
    <div className={styles.wrap}>
      {/* Signup-only fields (not required for login, but you can still show them) */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="auth-first">First name (signup)</label>
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
        <label className={styles.label} htmlFor="auth-last">Last name (signup)</label>
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
        <label className={styles.label} htmlFor="auth-phone">Phone (signup)</label>
        <input
          id="auth-phone"
          className={styles.input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          inputMode="tel"
          disabled={busy}
        />
      </div>

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
          autoComplete="current-password"
          disabled={busy}
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} disabled={busy} onClick={() => run(doSignup)}>
          Sign up
        </button>

        <button type="button" className={styles.primary} disabled={busy} onClick={() => run(doLogin)}>
          Log in
        </button>
      </div>

      {msg && <p className={styles.msg}>{msg}</p>}
    </div>
  );
}
