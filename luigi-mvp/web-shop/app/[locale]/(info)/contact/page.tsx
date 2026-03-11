import { getTranslations } from "next-intl/server";

export default async function ContactPage() {
  const t = await getTranslations("infoPages");

  return (
    <div style={{ padding: 24 }}>
      <h1>{t("contact")}</h1>
      <p>{t("comingSoon")}</p>
    </div>
  );
}