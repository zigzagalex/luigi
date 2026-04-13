import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { AdminAuthProvider } from "./components/auth/AdminAuthContext";
import { AdminLayoutShell } from "./components/admin/AdminLayoutShell";

const locales = ["en", "de", "fr", "it"] as const;

export const dynamic = "force-dynamic";

type Props = {
  children: ReactNode;
  params: { locale: string } | Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await Promise.resolve(params);

  if (!hasLocale(locales, locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AdminAuthProvider>
        <AdminLayoutShell>{children}</AdminLayoutShell>
      </AdminAuthProvider>
    </NextIntlClientProvider>
  );
}
