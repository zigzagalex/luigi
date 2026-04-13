import { Suspense } from "react";
import { AdminLoginPanel } from "../components/auth/AdminLoginPanel";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <p style={{ color: "var(--color-text-meta)", textAlign: "center", padding: "2rem" }}>
          …
        </p>
      }
    >
      <AdminLoginPanel />
    </Suspense>
  );
}
