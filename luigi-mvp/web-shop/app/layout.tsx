// app/layout.tsx
import "@/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Luigi Web-Shop",
  description: "Bike rentals",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <div className="site-header-title">CSS TEST 999</div>
            <div className="site-header-subtitle">DO YOU SEE THIS?</div>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
