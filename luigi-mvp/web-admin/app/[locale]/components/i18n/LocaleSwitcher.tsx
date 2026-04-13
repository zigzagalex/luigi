"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { locales, type Locale } from "@/../i18n/config";
import { useLocale } from "@/../i18n/useLocale";

import styles from "./LocaleSwitcher.module.css";

export default function LocaleSwitcher() {
  const t = useTranslations("locale");
  const router = useRouter();
  const pathname = usePathname(); // e.g. "/de/products/123"
  const currentLocale = useLocale();

  function setLocale(nextLocale: Locale) {
    if (!pathname) return;

    const parts = pathname.split("/");
    // parts[0] = "", parts[1] = current locale
    parts[1] = nextLocale;
    const nextPath = parts.join("/");

    // Persist preference for middleware redirects
    document.cookie = `locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;

    router.push(nextPath);
  }

  return (
    <label className={styles.wrap}>
      <span className={styles.srOnly}>{t("switchLabel")}</span>
      <select
        className={styles.select}
        value={currentLocale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t("switchLabel")}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {l.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}