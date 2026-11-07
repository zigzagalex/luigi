import pageShell from "../../PageShell.module.css";
import styles from "./CopyArticle.module.css";
import type { CopySection } from "@/../content/copy/types";

type Props = {
  title: string;
  intro: string;
  sections: CopySection[];
};

export default function CopyArticle({ title, intro, sections }: Props) {
  return (
    <main className={pageShell.page}>
      <div className={pageShell.inner}>
        <article className={styles.article}>
          <header className={pageShell.introSection}>
            <h1 className={pageShell.introTitle}>{title}</h1>
            <p className={styles.intro}>{intro}</p>
          </header>
          {sections.map((section) => (
            <section
              key={section.id}
              className={styles.section}
              aria-labelledby={section.id}
            >
              <h2 id={section.id} className={styles.heading}>
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
