"use client";

import { useAuth } from "@/components/auth/AuthContext";
import { CustomerProfileForm } from "@/components/customer/CustomerProfileForm";

export default function ProfilePage() {
  const { me, loading } = useAuth();

  if (loading) return <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>Loading…</div>;
  if (!me) return <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>Please sign in.</div>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px", display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
      </div>

      <CustomerProfileForm />
    </div>
  );
}
