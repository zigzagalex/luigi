import { getTranslations } from "next-intl/server";

export default async function ImprintPage() {
  const t = await getTranslations("legalPages");

  return (
    <div style={{ padding: 24 }}>
      <h1>{t("imprint")}</h1>
      <p>{t("comingSoon")}</p>
    </div>
  );
}