"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLocale } from "@/../i18n/useLocale";
import { useAuth } from "@/[locale]/components/auth/AuthContext";
import { useAuthModal } from "@/[locale]/components/auth/AuthModalContext";
import { CustomerProfileForm } from "@/[locale]/components/customer/CustomerProfileForm";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const t = useTranslations("profilePage");
  const tAuth = useTranslations("auth");
  const { me, loading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const locale = useLocale();

  if (loading) {
    return (
      <div className={styles.page}>
        <div
          className={styles.skeletonCard}
          aria-busy="true"
          aria-label={t("loading")}
        >
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLineSm} />
          <div className={styles.skeletonBlock} />
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.intro}>{t("signInPrompt")}</p>
        </header>
        <div className={styles.signedOut}>
          <div className={styles.ctaRow}>
            <button
              type="button"
              className={styles.primaryCta}
              onClick={openAuthModal}
            >
              {tAuth("loginSignup")}
            </button>
            <Link href={`/${locale}`} className={styles.shopLink}>
              {t("backToShop")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>{t("title")}</h1>
      </header>
      <CustomerProfileForm />
    </div>
  );
}
