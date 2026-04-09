export type FooterLink = { labelKey: string; href: string };

export type FooterColumn = {
  titleKey: string;
  links: FooterLink[];
};

export const footerColumns: FooterColumn[] = [
  {
    titleKey: "support",
    links: [
      { labelKey: "faq", href: "/faq" },
      { labelKey: "contact", href: "/contact" },
      { labelKey: "locations", href: "/locations" },
    ],
  },
  {
    titleKey: "company",
    links: [
      { labelKey: "about", href: "/about" },
      { labelKey: "products", href: "/products" },
      { labelKey: "accessories", href: "/accessories" },
      { labelKey: "search", href: "/search" },
    ],
  },
  {
    titleKey: "legal",
    links: [
      { labelKey: "agb", href: "/agbs" },
      { labelKey: "privacy", href: "/privacy" },
      { labelKey: "imprint", href: "/imprint" },
    ],
  },
];
