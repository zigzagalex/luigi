// app/[locale]/layout.tsx
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import AppHeaderShell from "./components/layout/AppHeaderShell";
import AppFooterShell from "./components/layout/AppFooterShell";
import { AuthProvider } from "./components/auth/AuthContext";
import { AuthModalProvider } from "./components/auth/AuthModalContext";
import { CartProvider } from "./components/cart/CartContext";
import { CartAddPopover } from "./components/cart/CartAddPopover";

const DEFAULT_SHOP_ID = 1;
const locales = ["en", "de", "fr", "it"] as const;
export const dynamic = "force-dynamic";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(locales, locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages({locale});

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <AuthModalProvider>
          <CartProvider shopId={DEFAULT_SHOP_ID}>
            <AppHeaderShell />
            {children}
            <AppFooterShell locale={locale} />
            <CartAddPopover />
          </CartProvider>
        </AuthModalProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}