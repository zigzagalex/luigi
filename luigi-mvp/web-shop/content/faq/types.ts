export type FaqItem = {
  /** Stable id for keys / anchors; do not rename once published if you care about links. */
  id: string;
  question: string;
  /** Plain text or short HTML-free copy; line breaks allowed in source strings. */
  answer: string;
};
