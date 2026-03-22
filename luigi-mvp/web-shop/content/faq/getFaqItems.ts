import { defaultLocale, isLocale, type Locale } from "../../i18n/config";
import { faqItemsDe } from "./de";
import { faqItemsEn } from "./en";
import { faqItemsFr } from "./fr";
import { faqItemsIt } from "./it";
import type { FaqItem } from "./types";

const byLocale: Record<Locale, FaqItem[]> = {
  de: faqItemsDe,
  en: faqItemsEn,
  fr: faqItemsFr,
  it: faqItemsIt,
};

export function getFaqItems(locale: string): FaqItem[] {
  if (isLocale(locale)) {
    return byLocale[locale];
  }
  return byLocale[defaultLocale];
}
