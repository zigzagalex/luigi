// app/layout.tsx
import "@/globals.css";
import AppHeaderShell from "./components/layout/AppHeaderShell";
import type { ReactNode } from "react";

export const metadata = {
  title: "Luigi Web-Shop",
  description: "Bike rentals",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <AppHeaderShell />
        {children}
      </body>
    </html>
  );
}
