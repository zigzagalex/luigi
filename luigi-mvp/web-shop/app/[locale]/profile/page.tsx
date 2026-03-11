"use client";

import { useAuth } from "@/[locale]/components/auth/AuthContext";
import { CustomerProfileForm } from "@/[locale]/components/customer/CustomerProfileForm";
import { useTranslations } from "next-intl";

export default function ProfilePage() {
  const t = useTranslations("profilePage");
  const { me, loading } = useAuth();

  if (loading) return <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>{t("loading")}</div>;
  if (!me) return <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>{t("signIn")}</div>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px", display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
      </div>

      <CustomerProfileForm />
    </div>
  );
}
