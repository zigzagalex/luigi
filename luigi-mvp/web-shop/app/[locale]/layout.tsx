// app/[locale]/layout.tsx
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import AppHeaderShell from "./components/layout/AppHeaderShell";
import AppFooterShell from "./components/layout/AppFooterShell";
import { AuthProvider } from "./components/auth/AuthContext";
import { CartProvider } from "./components/cart/CartContext";
import { CartAddPopover } from "./components/cart/CartAddPopover";

const DEFAULT_SHOP_ID = 1;
const locales = ["en", "de", "fr", "it"] as const;

type Props = {
  children: ReactNode;
  params: { locale: string } | Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await Promise.resolve(params);

  if (!hasLocale(locales, locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <CartProvider shopId={DEFAULT_SHOP_ID}>
          <AppHeaderShell />
          {children}
          <AppFooterShell />
          <CartAddPopover />
        </CartProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}