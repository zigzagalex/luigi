// i18n/request.ts
import {getRequestConfig} from 'next-intl/server';
import {hasLocale} from 'next-intl';

const locales = ['en', 'de', 'fr', 'it'] as const;
const defaultLocale = 'de';

export default getRequestConfig(async ({requestLocale}) => {
  // For locale-based routing, this usually corresponds to the `[locale]` segment
  const requested = await requestLocale;

  const locale = hasLocale(locales, requested) ? requested : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});