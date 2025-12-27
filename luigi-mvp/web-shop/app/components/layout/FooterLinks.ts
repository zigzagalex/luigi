export type FooterLink = { label: string; href: string };

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export const footerColumns: FooterColumn[] = [
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Kontakt", href: "/contact" },
      { label: "Standort", href: "/location" },
    ],
  },
  {
    title: "Unternehmen",
    links: [
      { label: "Über uns", href: "/about" },
      { label: "Produkte", href: "/products" },
      { label: "Suche", href: "/search" },
    ],
  },
  {
    title: "Rechtliches",
    links: [
      { label: "AGB", href: "/agb" },
      { label: "Datenschutz", href: "/privacy" },
      { label: "Impressum", href: "/imprint" },
    ],
  },
];
