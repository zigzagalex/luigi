import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { footerColumns } from "./FooterLinks";
import styles from "./AppFooterShell.module.css";

export default async function AppFooterShell() {
  const t = await getTranslations("footer");

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <nav aria-label={t("navAria")} className={styles.grid}>
          {footerColumns.map((col) => (
            <section key={col.titleKey} className={styles.col}>
              <h3 className={styles.title}>{t(col.titleKey)}</h3>
              <ul className={styles.list}>
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link className={styles.link} href={l.href}>
                      {t(l.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>

        <div className={styles.bottomRow}>
          <span className={styles.muted}>
            © {new Date().getFullYear()} Luigi
          </span>
        </div>
      </div>
    </footer>
  );
}
