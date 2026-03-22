import type { ComponentType, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;
export type IconComponent = ComponentType<IconProps>;

/** Search (header toggle, search pill submit) */
export function IconSearch(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="10.5" cy="10.5" r="6.75" stroke="currentColor" strokeWidth="2.1" />
      <path
        d="m15.75 15.75 4 4"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Shopping cart (cart button) */
export function IconCart(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3 5h2l2.2 10.2a1.2 1.2 0 0 0 1.2.95h7.95a1.2 1.2 0 0 0 1.17-.88L20 8H7.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19" r="1.2" fill="currentColor" />
      <circle cx="17" cy="19" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** Remove line item (cart popover) */
export function IconTrash(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

/** Reservations (account menu) */
export function IconReservations(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M8 6V4m8 2V4M5 10h14M5 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Profile / account (menu item, log-in mobile affordance) */
export function IconProfile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2ZM5 20a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Log out (account menu) */
export function IconLogout(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** CTA arrow on product cards */
export function IconArrowRight(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M4.16666 10H15.8333M15.8333 10L10.8333 5M15.8333 10L10.8333 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Warning triangle (cart page blocked items) */
export function IconWarning(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M1 21h22L12 2 1 21zm11-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
      />
    </svg>
  );
}

/** Home trust banner — choose a bike */
export function IconBikeChoose(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="7" cy="16" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17" cy="16" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9.8 16 12 8.5h3.8M12 8.5l2.1 4.2M12 8.5 10 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Home trust banner — reserve dates */
export function IconCalendarReserve(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M8 6V4m8 2V4M5 10h14M5 9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m10.3 14.2 1.9 1.9 3.8-4.3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Home trust banner — pay at store / pickup */
export function IconPayAtPickup(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 20V10l8-4 8 4v10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 20v-5h6v5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 12.5h2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Home trust banner — ride */
export function IconRideBike(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3.5 14h2M2.5 17h2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity={0.35}
      />
      <circle cx="8" cy="16" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17.5" cy="16" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M10.5 16 12.3 8.5h3.6l1.6 7.5M12.3 8.5 10.2 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Home trust banner — serviced / maintenance */
export function IconWrenchServiced(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="m14.8 4.8 2.1 2.1-4.3 4.3a2.9 2.9 0 1 0 2.1 2.1l4.3-4.3 2.1 2.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 17.5a2.5 2.5 0 1 0 0-3.5l1.8-1.8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Home trust banner — cancel up to 24h */
export function IconUndo24h(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 9.5V13l2.8 1.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 9.5A7.5 7.5 0 0 1 12 5.5v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Home trust banner — insurance */
export function IconShieldInsured(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 4 4 7v5c0 5 3.2 9.4 8 11 4.8-1.6 8-6 8-11V7l-8-3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9.3 12.5 1.9 1.9 3.8-4.3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Home trust banner — accessories range */
export function IconAccessoriesRange(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M6 8.5c0-2.2 2.7-4 6-4s6 1.8 6 4-2.7 4-6 4-6-1.8-6-4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 8.5v1c0 2.2 2.7 4 6 4s6-1.8 6-4v-1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 18h4M12.5 18h6M8 15.5h8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Metadata for the components overview and discoverability */
export const iconCatalog: { name: string; description: string; Icon: IconComponent }[] = [
  { name: "IconReservations", description: "Account menu → reservations", Icon: IconReservations },
  { name: "IconProfile", description: "Account menu, log-in (mobile)", Icon: IconProfile },
  { name: "IconLogout", description: "Account menu → log out", Icon: IconLogout },
  { name: "IconCart", description: "Header cart control", Icon: IconCart },
  { name: "IconTrash", description: "Remove item in cart popover", Icon: IconTrash },
  { name: "IconSearch", description: "PDP header search, search pill submit", Icon: IconSearch },
  { name: "IconArrowRight", description: "Product card rent CTA", Icon: IconArrowRight },
  { name: "IconWarning", description: "Cart page conflict / blocked items", Icon: IconWarning },
  { name: "IconBikeChoose", description: "Home trust banner — choose bike", Icon: IconBikeChoose },
  { name: "IconCalendarReserve", description: "Home trust banner — reserve", Icon: IconCalendarReserve },
  { name: "IconPayAtPickup", description: "Home trust banner — pay at pickup", Icon: IconPayAtPickup },
  { name: "IconRideBike", description: "Home trust banner — ride", Icon: IconRideBike },
  { name: "IconWrenchServiced", description: "Home trust banner — serviced", Icon: IconWrenchServiced },
  { name: "IconUndo24h", description: "Home trust banner — cancel window", Icon: IconUndo24h },
  { name: "IconShieldInsured", description: "Home trust banner — insured", Icon: IconShieldInsured },
  { name: "IconAccessoriesRange", description: "Home trust banner — accessories", Icon: IconAccessoriesRange },
];
