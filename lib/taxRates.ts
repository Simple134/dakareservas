/**
 * Local tax rates map — matches data from /api/gestiono/taxes
 * Used for fast tax rate resolution by taxRateId in PDF generators
 */

export interface LocalTaxRate {
  id: number;
  slug: string;
  name: string;
  rate: number;
  country: string;
}

export const TAX_RATES: Record<number, LocalTaxRate> = {
  1: {
    id: 1,
    slug: "ITBIS",
    name: "Impuesto sobre la transmisión de bienes",
    rate: 0.18,
    country: "DO",
  },
  2: {
    id: 2,
    slug: "ITBIS",
    name: "Impuesto sobre la transmisión de bienes",
    rate: 0.16,
    country: "DO",
  },
  3: {
    id: 3,
    slug: "ISC",
    name: "Impuesto selectivo al consumo",
    rate: 0.1,
    country: "DO",
  },
  4: {
    id: 4,
    slug: "CDT",
    name: "Contribución al Desarrollo de las Telecomunicaciones",
    rate: 0.02,
    country: "DO",
  },
};

/**
 * Get the tax rate for a given taxRateId.
 * Returns 0 if the taxRateId is not found.
 */
export function getTaxRateById(taxRateId: number): number {
  return TAX_RATES[taxRateId]?.rate ?? 0;
}

/**
 * Get the tax slug (e.g. "ITBIS", "ISC") for a given taxRateId.
 */
export function getTaxSlugById(taxRateId: number): string {
  return TAX_RATES[taxRateId]?.slug ?? "";
}
