"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import styles from "./AuthBox.module.css";

export function AuthBox() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function exchangeIdTokenForSessionCookie() {
    const user = auth.currentUser;
    if (!user) throw new Error("No currentUser after login");

    const idToken = await user.getIdToken();

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/v1/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Session exchange failed: ${res.status} ${body}`);
    }
  }

  async function run(fn: () => Promise<void>) {
    setMsg(null);
    setBusy(true);
    try {
      await fn();
      await exchangeIdTokenForSessionCookie();
      setMsg("Success. Session cookie set.");
    } catch (e: any) {
      setMsg(e?.message ?? "Something failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
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
          autoFocus
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
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondary}
          disabled={busy}
          onClick={() => run(() => createUserWithEmailAndPassword(auth, email, password).then(() => {}))}
        >
          Sign up
        </button>

        <button
          type="button"
          className={styles.primary}
          disabled={busy}
          onClick={() => run(() => signInWithEmailAndPassword(auth, email, password).then(() => {}))}
        >
          Log in
        </button>
      </div>

      {msg && <p className={styles.msg}>{msg}</p>}
    </div>
  );
}
