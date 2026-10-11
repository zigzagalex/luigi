import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { localeHref } from "@/../i18n/localeHref";

export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "notFound" });

  return (
    <main
      style={{
        maxWidth: 560,
        margin: "4rem auto",
        padding: "0 1.25rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>{t("title")}</h1>
      <p style={{ color: "#555", marginBottom: "1.5rem" }}>{t("body")}</p>
      <Link
        href={localeHref(locale, "/")}
        style={{
          display: "inline-block",
          padding: "0.65rem 1.25rem",
          background: "#0b1c2c",
          color: "#fff",
          borderRadius: 8,
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        {t("home")}
      </Link>
    </main>
  );
}
