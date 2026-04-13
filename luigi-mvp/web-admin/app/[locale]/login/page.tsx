import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AdminLoginForm } from "../components/admin/AdminLoginForm";

export default async function LoginPage() {
  const t = await getTranslations("admin");

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "var(--space-8) var(--space-6)" }}>
      <h1 style={{ marginBottom: "var(--space-2)" }}>{t("loginTitle")}</h1>
      <Suspense fallback={<p style={{ color: "var(--color-text-meta)" }}>…</p>}>
        <AdminLoginForm />
      </Suspense>
    </main>
  );
}
