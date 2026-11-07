export type CopySection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type CopyDocument = {
  intro: string;
  sections: CopySection[];
};
