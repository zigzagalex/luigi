// app/layout.tsx
import "@/globals.css";
import AppHeader from "./components/layout/AppHeader";
import type { ReactNode } from "react";

export const metadata = {
  title: "Luigi Web-Shop",
  description: "Bike rentals",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
