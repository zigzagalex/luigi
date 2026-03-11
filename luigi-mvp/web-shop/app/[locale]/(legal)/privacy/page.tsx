import { getTranslations } from "next-intl/server";

export default async function PrivacyPage() {
  const t = await getTranslations("legalPages");

  return (
    <div style={{ padding: 24 }}>
      <h1>{t("privacy")}</h1>
      <p>{t("comingSoon")}</p>
    </div>
  );
}