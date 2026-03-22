import { de, enUS, fr, it, type Locale } from "date-fns/locale";

export function dateFnsLocaleForAppLocale(appLocale: string): Locale {
  switch (appLocale) {
    case "de":
      return de;
    case "fr":
      return fr;
    case "it":
      return it;
    default:
      return enUS;
  }
}

/** BCP 47 tag for `Intl` formatters (search pill summary, etc.) */
export function intlLocaleTagForAppLocale(appLocale: string): string {
  switch (appLocale) {
    case "de":
      return "de-CH";
    case "fr":
      return "fr-CH";
    case "it":
      return "it-CH";
    default:
      return "en-GB";
  }
}
