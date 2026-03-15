import Link from "next/link";
import styles from "./components-page.module.css";
import ui from "./ui/primitives.module.css";
import typography from "./ui/typography.module.css";

export default function ComponentsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>UI Components</h1>
        <p className={styles.subtitle}>
          Shared primitives used across the web-shop. This page helps review consistency in one place.
        </p>
        <p className={`${styles.introCode} ${typography.fontCode}`}>
          Global default font: <code>--font-sans</code>. Utility token for code/UI metadata:{" "}
          <code>--font-mono</code>.
        </p>

        <div className={styles.grid}>
          <section className={styles.card} aria-labelledby="fonts-tokens">
            <h2 id="fonts-tokens" className={`${styles.cardTitle} ${typography.fontSectionTitle}`}>
              Font Tokens
            </h2>
            <div className={styles.tokenGrid}>
              <div className={styles.tokenRow}>
                <span className={typography.fontCode}>--font-sans</span>
                <span className={typography.fontBody}>Primary UI font for headings, body, controls and labels.</span>
              </div>
              <div className={styles.tokenRow}>
                <span className={typography.fontCode}>--font-mono</span>
                <span className={typography.fontBody}>Code-like metadata and technical labels.</span>
              </div>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="typography-scale">
            <h2 id="typography-scale" className={`${styles.cardTitle} ${typography.fontSectionTitle}`}>
              Typography Scale
            </h2>
            <div className={styles.typeSamples}>
              <h3 className={`${styles.sampleHeading} ${typography.fontHeading}`}>Heading Example</h3>
              <p className={typography.fontBody}>Body text example used for normal content across pages.</p>
              <p className={typography.fontLabel}>Label text example for fields and smaller descriptions.</p>
              <p className={typography.fontCode}>Code token / technical metadata example.</p>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="surface-buttons">
            <h2 id="surface-buttons" className={styles.cardTitle}>
              Surface Buttons
            </h2>
            <div className={styles.row}>
              <button type="button" className={ui.surfaceButtonSm}>
                Small
              </button>
              <button type="button" className={ui.surfaceButtonMdMuted}>
                Medium
              </button>
              <button type="button" className={ui.surfaceButtonLgStrong}>
                Large
              </button>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="links">
            <h2 id="links" className={styles.cardTitle}>
              Link Buttons
            </h2>
            <div className={styles.row}>
              <Link href="/" className={ui.surfaceLinkButton}>
                Primary Link
              </Link>
              <Link href="/" className={ui.surfaceLinkButtonMuted}>
                Secondary Link
              </Link>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="inputs">
            <h2 id="inputs" className={styles.cardTitle}>
              Inputs
            </h2>
            <div className={styles.inputWrap}>
              <label htmlFor="component-showcase-input" className={styles.label}>
                Text input
              </label>
              <input id="component-showcase-input" className={ui.surfaceInput} placeholder="Input primitive" />
            </div>
          </section>

          <section className={styles.card} aria-labelledby="header-controls">
            <h2 id="header-controls" className={styles.cardTitle}>
              Header Controls
            </h2>
            <div className={styles.placeholderBox}>
              <div className={styles.row}>
                <button type="button" className={ui.headerPillButton}>
                  Login / Signup
                </button>
                <button type="button" className={ui.cartIconButton} aria-label="Cart">
                  <span aria-hidden="true">🛒</span>
                  <span className={ui.cartIconBadge}>2</span>
                </button>
              </div>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="modal-actions">
            <h2 id="modal-actions" className={styles.cardTitle}>
              Modal Actions
            </h2>
            <div className={styles.row}>
              <button type="button" className={ui.modalGhostButton}>
                Cancel
              </button>
              <button type="button" className={ui.modalPrimaryButton}>
                Confirm
              </button>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="cta">
            <h2 id="cta" className={styles.cardTitle}>
              Primary CTA
            </h2>
            <button type="button" className={ui.darkPrimaryCta}>
              Add to cart
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
