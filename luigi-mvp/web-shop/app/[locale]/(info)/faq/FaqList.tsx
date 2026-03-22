import Link from "next/link";

import { getFaqItems } from "@/../content/faq/getFaqItems";
import styles from "./faq.module.css";

type Props = {
  locale: string;
  contactPrompt: string;
  contactLink: string;
};

export default function FaqList({ locale, contactPrompt, contactLink }: Props) {
  const items = getFaqItems(locale);

  return (
    <>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id}>
            <details className={styles.item} name="faq">
              <summary className={styles.summary}>{item.question}</summary>
              <div className={styles.answer}>{item.answer}</div>
            </details>
          </li>
        ))}
      </ul>
      <p className={styles.cta}>
        {contactPrompt}{" "}
        <Link className={styles.ctaLink} href={`/${locale}/contact`}>
          {contactLink}
        </Link>
      </p>
    </>
  );
}
