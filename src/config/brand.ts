/**
 * Single-file branding. Change these values to rebrand the whole application;
 * nothing else needs to be touched. Values that should differ per deployment
 * without a rebuild are read from agency_settings in the database instead.
 */
export const brand = {
  name: 'Northpoint Digital',
  shortName: 'Northpoint',
  tagline: 'Web design, development and support',
  productName: 'Client Portal',
  supportEmail: 'hello@northpointdigital.test',
  /** Used for the logo mark when no logo image is configured. */
  initials: 'ND',
  /**
   * Primary hue as an OKLCH triple. The stylesheet derives the full scale from
   * this, so a single edit re-tints the application in both light and dark mode.
   */
  primary: {
    light: 'oklch(0.55 0.19 267)',
    dark: 'oklch(0.70 0.16 267)',
  },
  defaultCurrency: 'GBP',
  locale: 'en-GB',
  timeZone: 'Europe/London',
} as const;

export type Brand = typeof brand;
