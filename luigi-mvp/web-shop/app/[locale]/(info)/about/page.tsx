import { getTranslations } from "next-intl/server";

import { getAboutCopy } from "@/../content/about/getAboutCopy";
import CopyArticle from "../../components/layout/CopyArticle";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "infoPages" });
  const copy = getAboutCopy(locale);

  return (
    <CopyArticle title={t("about")} intro={copy.intro} sections={copy.sections} />
  );
}
