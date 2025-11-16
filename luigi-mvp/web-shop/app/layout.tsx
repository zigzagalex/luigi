import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Luigi Web-Shop",
  description: "Bike rentals",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#f5f5f5",
        }}
      >
        <header
          style={{
            padding: "16px 24px",
            background: "#111827",
            color: "white",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20 }}>Luigi Web-Shop</h1>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>Bike rentals</p>
        </header>

        <main style={{ padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}
