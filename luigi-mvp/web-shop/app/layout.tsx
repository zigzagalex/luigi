// app/layout.tsx
import "@/globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import AppHeaderShell from "./components/layout/AppHeaderShell";
import AppFooterShell from "./components/layout/AppFooterShell";
import { AuthProvider } from "@/components/auth/AuthContext";
import { CartProvider } from "@/components/cart/CartContext";
import { CartAddPopover } from "./components/cart/CartAddPopover";


export const metadata: Metadata = {
  title: "Luigi Web-Shop",
  description: "Bike rentals",
};

const DEFAULT_SHOP_ID = 1

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
      <AuthProvider>
        <CartProvider shopId={DEFAULT_SHOP_ID}>
            <AppHeaderShell />
              {children}
            <AppFooterShell />
            <CartAddPopover />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
