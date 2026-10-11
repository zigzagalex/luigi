"use client";

import { useTranslations } from "next-intl";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import { useAdminStore } from "@/[locale]/components/admin/AdminStoreContext";
import LocaleSwitcher from "@/[locale]/components/i18n/LocaleSwitcher";
import styles from "./AdminShell.module.css";

export function AdminTopBar({
  showMenuButton = false,
  navOpen = false,
  onToggleNav,
}: {
  showMenuButton?: boolean;
  navOpen?: boolean;
  onToggleNav?: () => void;
}) {
  const t = useTranslations("admin");
  const { me, logout } = useAdminAuth();
  const { stores, selectedStoreId, setSelectedStoreId, loading } = useAdminStore();

  return (
    <header className={styles.topBar}>
      <div className={styles.topBarLeft}>
        {showMenuButton ? (
          <button
            type="button"
            className={styles.menuBtn}
            aria-expanded={navOpen}
            aria-controls="admin-sidebar"
            onClick={onToggleNav}
          >
            {navOpen ? t("close") : t("navMenu")}
          </button>
        ) : null}
        <span className={styles.topBarBrand}>LUIGI ADMIN</span>
      </div>
      <div className={styles.topBarRight}>
        <label className={styles.storePickerLabel}>
          <span className={styles.storePickerText}>{t("storeCityFilterLabel")}</span>
          <select
            className={styles.storePickerSelect}
            value={selectedStoreId ?? ""}
            onChange={(e) => {
              const next = e.target.value;
              setSelectedStoreId(next ? Number(next) : null);
            }}
            disabled={loading || stores.length === 0}
            aria-label={t("storeCityFilterLabel")}
          >
            <option value="">{t("storeCityFilterAll")}</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.city}
              </option>
            ))}
          </select>
        </label>
        <LocaleSwitcher />
        {me ? (
          <button type="button" className={styles.logoutBtn} onClick={() => void logout()}>
            {t("logout")}
          </button>
        ) : null}
      </div>
    </header>
  );
}
