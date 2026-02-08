"use client";

import * as React from "react";
import Link from "next/link";

export default function CheckoutConfirmationPage() {
  const [payload, setPayload] = React.useState<string>("");

  React.useEffect(() => {
    const v = sessionStorage.getItem("luigi_checkout_payload");
    setPayload(v ?? "{}");
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px", display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>Confirmation</h1>
        <Link href="/cart" style={{ color: "#444", textDecoration: "underline" }}>
          Back to cart
        </Link>
      </div>

      <p style={{ color: "#666" }}>
        For now, this page only shows the JSON payload that will be sent to the backend later.
      </p>

      <pre
        style={{
          border: "1px solid #eee",
          borderRadius: 16,
          padding: 20,
          background: "#fafafa",
          whiteSpace: "pre-wrap",
          overflowX: "auto",
          fontSize: 12,
          lineHeight: 1.4,
        }}
      >
        {payload}
      </pre>
    </div>
  );
}
