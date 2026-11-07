"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { isValidPhoneNumber } from "libphonenumber-js";

import PhoneField from "../../components/auth/PhoneField";
import styles from "./contact.module.css";

type FieldErrors = {
  email?: string;
  phone?: string;
  message?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactForm() {
  const t = useTranslations("contactPage");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: FieldErrors = {};
    if (!emailPattern.test(email.trim())) next.email = t("invalidEmail");
    if (!phone || !isValidPhoneNumber(phone)) next.phone = t("invalidPhone");
    if (!message.trim()) next.message = t("messageRequired");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSent(true);
  }

  if (sent) {
    return (
      <div className={styles.thanks} role="status">
        <h2 className={styles.thanksTitle}>{t("thanksTitle")}</h2>
        <p className={styles.thanksBody}>{t("thanksBody")}</p>
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => {
            setSent(false);
            setMessage("");
            setErrors({});
          }}
        >
          {t("writeAnother")}
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="contact-email">
            {t("email")}
          </label>
          <input
            id="contact-email"
            className={styles.input}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {errors.email ? (
            <p id="contact-email-error" className={styles.error} role="alert">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <span className={styles.label} id="contact-phone-label">
            {t("phone")}
          </span>
          <div aria-labelledby="contact-phone-label">
            <PhoneField value={phone} onChange={setPhone} defaultCountry="CH" />
          </div>
          {errors.phone ? (
            <p className={styles.error} role="alert">
              {errors.phone}
            </p>
          ) : null}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="contact-message">
          {t("message")}
        </label>
        <textarea
          id="contact-message"
          className={styles.textarea}
          name="message"
          rows={6}
          placeholder={t("messagePlaceholder")}
          value={message}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          onChange={(event) => setMessage(event.target.value)}
          required
        />
        {errors.message ? (
          <p id="contact-message-error" className={styles.error} role="alert">
            {errors.message}
          </p>
        ) : null}
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.button}>
          {t("send")}
        </button>
      </div>
    </form>
  );
}
