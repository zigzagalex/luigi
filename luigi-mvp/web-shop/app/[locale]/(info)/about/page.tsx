import { getTranslations } from "next-intl/server";

export default async function AboutPage() {
  const t = await getTranslations("infoPages");

  return (
    <div style={{ padding: 24 }}>
      <h1>{t("about")}</h1>
      <p>{t("comingSoon")}</p>
    </div>
  );
}