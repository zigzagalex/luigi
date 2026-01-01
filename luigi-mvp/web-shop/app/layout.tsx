// app/layout.tsx
import "@/globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import AppHeaderShell from "./components/layout/AppHeaderShell";
import AppFooterShell from "./components/layout/AppFooterShell";
import { AuthProvider } from "@/components/auth/AuthContext";

export const metadata: Metadata = {
  title: "Luigi Web-Shop",
  description: "Bike rentals",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
          <AppHeaderShell />
          {children}
          <AppFooterShell />
      </body>
    </html>
  );
}
