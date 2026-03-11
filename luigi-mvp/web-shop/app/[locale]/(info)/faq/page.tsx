import { getTranslations } from "next-intl/server";

export default async function FAQPage() {
  const t = await getTranslations("infoPages");

  return (
    <div style={{ padding: 24 }}>
      <h1>{t("faq")}</h1>
      <p>{t("comingSoon")}</p>
    </div>
  );
}