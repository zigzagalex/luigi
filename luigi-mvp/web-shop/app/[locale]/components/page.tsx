import Link from "next/link";
import styles from "./components-page.module.css";
import { iconCatalog } from "./icons";
import ui from "./ui/primitives.module.css";
import typography from "./ui/typography.module.css";

export default function ComponentsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.leadBlock}>
          <h1 className={`${styles.title} ${typography.h1}`}>UI Components</h1>
          <p className={`${styles.subtitle} ${typography.body}`}>
            Shared primitives used across the web-shop. This page helps review consistency in one place.
          </p>
          <p className={`${styles.introCode} ${typography.meta}`}>
            Core design roles are tokenized with <code className={typography.fontCode}>:root</code> variables in{" "}
            <code className={typography.fontCode}>globals.css</code>.
          </p>
        </div>

        <div className={styles.grid}>
          <section className={`${styles.card} ${styles.cardWide}`} aria-labelledby="icons-catalog">
            <h2 id="icons-catalog" className={`${styles.cardTitle} ${typography.h3}`}>
              Icons
            </h2>
            <p className={typography.body}>
              Stroke and filled SVGs live in{" "}
              <code className={typography.fontCode}>app/[locale]/components/icons/</code>. Import named exports
              (for example <code className={typography.fontCode}>IconCart</code>) or reuse{" "}
              <code className={typography.fontCode}>iconCatalog</code> for tooling or docs.
            </p>
            <div className={styles.iconCatalog}>
              {iconCatalog.map(({ name, description, Icon }) => (
                <div key={name} className={styles.iconCatalogItem}>
                  <div className={styles.iconCatalogPreview} aria-hidden>
                    <Icon className={styles.iconCatalogGlyph} />
                  </div>
                  <code className={`${styles.iconCatalogCode} ${typography.fontCode}`}>{name}</code>
                  <p className={`${styles.iconCatalogMeta} ${typography.meta}`}>{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.card} aria-labelledby="fonts-tokens">
            <h2 id="fonts-tokens" className={`${styles.cardTitle} ${typography.h3}`}>
              Font Tokens
            </h2>
            <div className={styles.tokenGrid}>
              <div className={styles.tokenRow}>
                <span className={typography.fontCode}>--font-sans</span>
                <span className={typography.body}>Primary UI font for headings, body, controls and labels.</span>
              </div>
              <div className={styles.tokenRow}>
                <span className={typography.fontCode}>--font-mono</span>
                <span className={typography.body}>Code-like metadata and technical labels.</span>
              </div>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="typography-scale">
            <h2 id="typography-scale" className={`${styles.cardTitle} ${typography.h3}`}>
              Typography Scale
            </h2>
            <div className={styles.typeSamples}>
              <h1 className={`${styles.sampleHeading} ${typography.h1}`}>H1: Primary page headline</h1>
              <h2 className={`${styles.sampleHeading} ${typography.h2}`}>H2: Section headline</h2>
              <h3 className={`${styles.sampleHeading} ${typography.h3}`}>H3: Group headline</h3>
              <p className={typography.body}>Body: default content copy with readable line height for scan speed.</p>
              <p className={typography.meta}>Meta: supporting context, helper text and low-emphasis metadata.</p>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="spacing-scale">
            <h2 id="spacing-scale" className={`${styles.cardTitle} ${typography.h3}`}>
              Spacing Scale
            </h2>
            <p className={typography.body}>Use only 4px-based steps to keep grouping and rhythm predictable.</p>
            <ul className={`${styles.scaleList} ${typography.meta}`}>
              <li>xs = 4 / 8px: icon gaps and tiny clusters</li>
              <li>sm = 12 / 16px: form fields and compact cards</li>
              <li>md = 20 / 24px: card sections and grouped content</li>
              <li>lg = 32 / 40px: page sections and visual separation</li>
              <li>xl = 48 / 64px: hero and major breakpoints</li>
            </ul>
          </section>

          <section className={styles.card} aria-labelledby="color-roles">
            <h2 id="color-roles" className={`${styles.cardTitle} ${typography.h3}`}>
              Color Roles
            </h2>
            <div className={styles.swatchGrid}>
              <div className={styles.swatch}>
                <div className={styles.swatchChip} style={{ background: "var(--color-primary)" }} />
                <p className={`${styles.swatchCode} ${typography.meta}`}>
                  Primary action <code className={typography.fontCode}>--color-primary</code>
                </p>
              </div>
              <div className={styles.swatch}>
                <div className={styles.swatchChip} style={{ background: "var(--color-secondary)" }} />
                <p className={`${styles.swatchCode} ${typography.meta}`}>
                  Secondary action <code className={typography.fontCode}>--color-secondary</code>
                </p>
              </div>
              <div className={styles.swatch}>
                <div className={styles.swatchChip} style={{ background: "var(--color-bg-surface)" }} />
                <p className={`${styles.swatchCode} ${typography.meta}`}>
                  Neutral surface <code className={typography.fontCode}>--color-bg-surface</code>
                </p>
              </div>
              <div className={styles.swatch}>
                <div className={styles.swatchChip} style={{ background: "var(--color-divider-ghost)" }} />
                <p className={`${styles.swatchCode} ${typography.meta}`}>
                  Soft divider <code className={typography.fontCode}>--color-divider-ghost</code>
                </p>
              </div>
              <div className={styles.swatch}>
                <div className={styles.swatchChip} style={{ background: "var(--color-bg-section-band)" }} />
                <p className={`${styles.swatchCode} ${typography.meta}`}>
                  Homepage category strips (tinted from primary){' '}
                  <code className={typography.fontCode}>--color-bg-section-band</code>
                </p>
              </div>
              <div className={styles.swatch}>
                <div className={styles.swatchChip} style={{ background: "var(--color-accent-danger)" }} />
                <p className={`${styles.swatchCode} ${typography.meta}`}>
                  Accent for urgent state <code className={typography.fontCode}>--color-accent-danger</code>
                </p>
              </div>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="button-hierarchy">
            <h2 id="button-hierarchy" className={`${styles.cardTitle} ${typography.h3}`}>
              Button Hierarchy
            </h2>
            <div className={styles.row}>
              <button type="button" className={ui.buttonPrimary}>
                Primary Action
              </button>
              <button type="button" className={ui.buttonSecondary}>
                Secondary Action
              </button>
              <button type="button" className={ui.buttonTertiary}>
                Tertiary Action
              </button>
            </div>
            <p className={typography.meta}>Primary drives conversion; secondary supports; tertiary is low-emphasis.</p>
          </section>

          <section className={styles.card} aria-labelledby="selection-pills">
            <h2 id="selection-pills" className={`${styles.cardTitle} ${typography.h3}`}>
              Selection Pills
            </h2>
            <div className={styles.row}>
              <button type="button" className={ui.selectionPill}>
                Default
              </button>
              <button type="button" className={`${ui.selectionPill} ${ui.selectionPillSelected}`}>
                Selected
              </button>
              <button type="button" className={`${ui.selectionPill} ${ui.selectionPillDisabled}`} disabled>
                Disabled
              </button>
            </div>
            <p className={typography.meta}>
              Use pills for mutually-exclusive options like pickup location and size.
            </p>
          </section>

          <section className={styles.card} aria-labelledby="accessibility">
            <h2 id="accessibility" className={`${styles.cardTitle} ${typography.h3}`}>
              Accessibility Baseline
            </h2>
            <div className={styles.accessibilityPanel}>
              <p className={typography.body}>All controls target a minimum 44px hit area for touch and mouse comfort.</p>
              <p className={typography.body}>Focus-visible outlines use a high-contrast ring to support keyboard users.</p>
              <p className={typography.body}>Body and meta text colors are selected for strong contrast on light surfaces.</p>
              <div className={styles.row}>
                <button type="button" className={ui.buttonSecondary}>
                  Try keyboard focus
                </button>
                <span className={`${styles.metaBadge} ${typography.meta}`}>AA-oriented contrast defaults</span>
              </div>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="inputs">
            <h2 id="inputs" className={`${styles.cardTitle} ${typography.h3}`}>
              Input Primitive
            </h2>
            <div className={styles.inputWrap}>
              <label htmlFor="component-showcase-input" className={`${styles.label} ${typography.meta}`}>
                Text input
              </label>
              <input id="component-showcase-input" className={ui.surfaceInput} placeholder="Input primitive" />
            </div>
          </section>

          <section className={styles.card} aria-labelledby="links">
            <h2 id="links" className={`${styles.cardTitle} ${typography.h3}`}>
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
        </div>
      </div>
    </main>
  );
}
