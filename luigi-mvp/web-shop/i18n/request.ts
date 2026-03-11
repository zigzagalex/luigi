// i18n/request.ts
import {getRequestConfig} from 'next-intl/server';
import {hasLocale} from 'next-intl';

const locales = ['en', 'de', 'fr', 'it'] as const;
const defaultLocale = 'de';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const baseValue = result[key];

    if (isRecord(baseValue) && isRecord(value)) {
      result[key] = deepMerge(baseValue, value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export default getRequestConfig(async ({requestLocale}) => {
  // For locale-based routing, this usually corresponds to the `[locale]` segment
  const requested = await requestLocale;

  const locale = hasLocale(locales, requested) ? requested : defaultLocale;

  const enMessages = (await import("../messages/en.json")).default as Record<string, unknown>;
  const localeMessages = (await import(`../messages/${locale}.json`)).default as Record<string, unknown>;

  return {
    locale,
    messages: deepMerge(enMessages, localeMessages)
  };
});