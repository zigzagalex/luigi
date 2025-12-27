import Link from "next/link";
import { footerColumns } from "./FooterLinks";
import styles from "./AppFooterShell.module.css";

export default function AppFooterShell() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <nav aria-label="Footer" className={styles.grid}>
          {footerColumns.map((col) => (
            <section key={col.title} className={styles.col}>
              <h3 className={styles.title}>{col.title}</h3>
              <ul className={styles.list}>
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link className={styles.link} href={l.href}>
                      {l.label}
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
