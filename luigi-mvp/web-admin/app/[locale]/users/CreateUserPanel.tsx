"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import PhoneField from "@/[locale]/components/auth/PhoneField";
import { SHOP_ID } from "@/lib/AuthSession";
import { createUser } from "@/lib/usersApi";
import formStyles from "./createUserPanel.module.css";

function clean(s: string) {
  return s.trim();
}

type Props = {
  onUserCreated?: () => void | Promise<void>;
};

export function CreateUserPanel({ onUserCreated }: Props) {
  const tAuth = useTranslations("authModal");
  const tAdmin = useTranslations("admin");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formStatus, setFormStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [flash, setFlash] = useState<{ text: string; ok: boolean } | null>(null);

  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");

  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  function resetFormFields() {
    setPhone("");
    setPhoneValid(false);
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setRole("staff");
    setFormStatus(null);
  }

  function handleOpen() {
    setFlash(null);
    setOpen(true);
  }

  function handleCancel() {
    if (busy) return;
    setOpen(false);
    resetFormFields();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setFormStatus(null);
    setBusy(true);

    try {
      const eMail = clean(email);
      const fn = clean(firstName);
      const ln = clean(lastName);
      const ph = clean(phone);

      if (!fn || !ln || !ph || !eMail || !password) {
        setFormStatus({ text: tAuth("fillAllFields"), ok: false });
        return;
      }

      if (!phoneValid) {
        setFormStatus({ text: tAuth("invalidPhone"), ok: false });
        return;
      }

      await createUser({
        shop_id: SHOP_ID,
        email: eMail,
        password,
        first_name: fn,
        last_name: ln,
        phone: ph,
        role,
      });

      resetFormFields();
      setOpen(false);
      setFlash({ text: tAdmin("createSuccess"), ok: true });
      await onUserCreated?.();
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim() !== ""
          ? err.message
          : tAdmin("createError");
      setFormStatus({ text: msg, ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={formStyles.section}>
      {flash ? (
        <p className={flash.ok ? formStyles.flashOk : formStyles.flashErr} role="status">
          {flash.text}
        </p>
      ) : null}

      {!open ? (
        <button type="button" className={formStyles.toggleBtn} onClick={handleOpen}>
          {tAdmin("showCreateUserForm")}
        </button>
      ) : (
        <div className={formStyles.panel}>
          <div className={formStyles.panelHead}>
            <div>
              <h2 className={formStyles.title}>{tAuth("createAccountTitle")}</h2>
              <p className={formStyles.subtitle}>{tAuth("signupSubtitle")}</p>
            </div>
            <button type="button" className={formStyles.cancelBtn} onClick={handleCancel} disabled={busy}>
              {tAdmin("cancelCreateUser")}
            </button>
          </div>

          <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
            <div className={formStyles.twoCol}>
              <label htmlFor="admin-new-first" className={formStyles.field}>
                <span className={formStyles.label}>{tAuth("firstName")}</span>
                <input
                  ref={firstFieldRef}
                  id="admin-new-first"
                  name="first_name"
                  className={formStyles.input}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  disabled={busy}
                />
              </label>

              <label htmlFor="admin-new-last" className={formStyles.field}>
                <span className={formStyles.label}>{tAuth("lastName")}</span>
                <input
                  id="admin-new-last"
                  name="last_name"
                  className={formStyles.input}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  disabled={busy}
                />
              </label>
            </div>

            <label htmlFor="admin-new-phone" className={formStyles.field}>
              <span className={formStyles.label}>{tAuth("phoneNumber")}</span>
              <PhoneField
                value={phone}
                onChange={setPhone}
                defaultCountry="CH"
                onValidityChange={setPhoneValid}
                disabled={busy}
              />
            </label>

            <label htmlFor="admin-new-email" className={formStyles.field}>
              <span className={formStyles.label}>{tAuth("emailAddress")}</span>
              <input
                id="admin-new-email"
                name="email"
                className={formStyles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={busy}
              />
            </label>

            <label htmlFor="admin-new-password" className={formStyles.field}>
              <span className={formStyles.label}>{tAuth("password")}</span>
              <input
                id="admin-new-password"
                name="password"
                className={formStyles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={busy}
                minLength={6}
              />
            </label>

            <label htmlFor="admin-new-role" className={formStyles.field}>
              <span className={formStyles.label}>{tAdmin("role")}</span>
              <select
                id="admin-new-role"
                name="role"
                className={`${formStyles.input} ${formStyles.select}`}
                value={role}
                onChange={(e) => setRole(e.target.value as "staff" | "admin")}
                disabled={busy}
              >
                <option value="staff">{tAdmin("roleStaff")}</option>
                <option value="admin">{tAdmin("roleAdmin")}</option>
              </select>
            </label>

            {formStatus ? (
              <p className={formStatus.ok ? formStyles.statusOk : formStyles.statusErr} role="alert">
                {formStatus.text}
              </p>
            ) : null}

            <button className={formStyles.primary} type="submit" disabled={busy}>
              {busy ? tAdmin("creating") : tAuth("createAccount")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
