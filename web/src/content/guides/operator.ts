/**
 * The company behind DentVideo, exactly as in the Montenegrin business
 * register (CRPS) extract. Shown on the legal pages (Imprint, Terms, Privacy,
 * DPA), in the footer and in the Organization structured data
 * (content/guides/entity re-exports it).
 *
 * Public register data only: never add personal data beyond the managing
 * director's name (no ID or passport numbers, birth dates, home addresses or
 * ownership). Not VAT-registered as far as we know, so no VAT number is printed.
 */
export const OPERATOR = {
  legalName: '"BLS AI AUTOMATION" DOO PODGORICA',
  shortName: "BLS AI Automation DOO",
  /** Trading brand; DentVideo is its product. */
  brand: "Bulsu Labs",
  product: "DentVideo",
  legalFormLocal: "društvo sa ograničenom odgovornošću",
  street: "Neznanih Junaka 60",
  postalCode: "81000",
  city: "Podgorica",
  country: "Montenegro",
  countryCode: "ME",
  registerLocal: "Centralni registar privrednih subjekata (CRPS)",
  registrationNumber: "5-1333594",
  /** PIB (poreski identifikacioni broj). */
  taxId: "03784410",
  director: "Berke Bulsu",
  productEmail: "hello@dentvideo.com",
  companyEmail: "info@bulsulabs.com",
} as const;
