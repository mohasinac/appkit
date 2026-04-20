// appkit/src/seed/seed-market-config.ts
// Locale-specific data pools for seed factories and fixtures.
// Default pools match current letitrip.in baseline (Indian market).

import {
  getMarketProfile,
  getDefaultCurrency,
  getDefaultCurrencySymbol,
  getDefaultPhonePrefix,
  getDefaultCountry,
  type MarketProfile,
} from "../core/baseline-resolver";

// ---------------------------------------------------------------------------
// Re-export baseline accessors for convenience within seed layer
// ---------------------------------------------------------------------------

export {
  getMarketProfile,
  getDefaultCurrency,
  getDefaultCurrencySymbol,
  getDefaultPhonePrefix,
  getDefaultCountry,
};
export type { MarketProfile };

// ---------------------------------------------------------------------------
// Locale data pools
// ---------------------------------------------------------------------------

export interface SeedLocaleData {
  firstNames: readonly string[];
  lastNames: readonly string[];
  cities: ReadonlyArray<readonly [city: string, state: string, postal: string]>;
  streetNames: readonly string[];
  buildingNames: readonly string[];
  productNames: readonly string[];
  productCategories: readonly string[];
  /** Country name for display (e.g. "India", "United States") */
  countryName: string;
}

// --- Indian locale (default baseline) ---------------------------------------

const INDIAN_LOCALE: SeedLocaleData = {
  firstNames: [
    "Priya",
    "Rahul",
    "Anjali",
    "Arjun",
    "Sneha",
    "Vikram",
    "Kavya",
    "Rohan",
    "Pooja",
    "Aditya",
    "Deepa",
    "Karthik",
    "Meena",
    "Suresh",
    "Nisha",
    "Amit",
    "Shalini",
    "Rajesh",
    "Divya",
    "Manish",
  ],
  lastNames: [
    "Sharma",
    "Patel",
    "Iyer",
    "Nair",
    "Singh",
    "Reddy",
    "Mehta",
    "Joshi",
    "Gupta",
    "Pillai",
    "Rao",
    "Kumar",
    "Verma",
    "Shah",
    "Desai",
    "Chopra",
    "Malhotra",
    "Saxena",
    "Kapoor",
    "Bhat",
  ],
  cities: [
    ["Mumbai", "Maharashtra", "400001"],
    ["New Delhi", "Delhi", "110001"],
    ["Bengaluru", "Karnataka", "560001"],
    ["Hyderabad", "Telangana", "500001"],
    ["Chennai", "Tamil Nadu", "600001"],
    ["Kolkata", "West Bengal", "700001"],
    ["Pune", "Maharashtra", "411001"],
    ["Ahmedabad", "Gujarat", "380001"],
    ["Jaipur", "Rajasthan", "302001"],
    ["Lucknow", "Uttar Pradesh", "226001"],
    ["Kochi", "Kerala", "682001"],
    ["Chandigarh", "Punjab", "160001"],
    ["Bhopal", "Madhya Pradesh", "462001"],
    ["Surat", "Gujarat", "395001"],
    ["Indore", "Madhya Pradesh", "452001"],
  ],
  streetNames: [
    "MG Road",
    "Station Road",
    "Main Street",
    "Gandhi Nagar",
    "Nehru Place",
    "Park Street",
    "Market Road",
    "Church Road",
  ],
  buildingNames: [
    "Shanti Apartments",
    "Laxmi Niwas",
    "Ganga Tower",
    "Sunrise Complex",
    "Green Park",
    "Silver Enclave",
    "Raj Towers",
    "Bhavani Heights",
  ],
  productNames: [
    "Handloom Cotton Saree",
    "Silver Oxidised Jhumkas",
    "Brass Pooja Diya Set",
    "Khadi Kurta & Pyjama Set",
    "Terracotta Flower Vase",
    "Sandalwood Incense Sticks",
    "Batik Print Salwar Suit",
    "Copper Water Bottle",
    "Warli Art Wall Frame",
    "Clay Tea Kadai Set",
    "Jute Laptop Bag",
    "Madhubani Painting Print",
    "Organic Tulsi Green Tea",
    "Kantha Embroidered Cushion",
    "Brass Dancing Ganesha Figurine",
    "Block Print Bedsheet Set",
    "Bamboo Cutlery Kit",
    "Dhokra Metal Elephant",
    "Rajasthani Mojari Jutti",
    "Coconut Shell Bowl Set",
  ],
  productCategories: [
    "clothing",
    "jewellery",
    "home-decor",
    "food-beverages",
    "art-crafts",
    "wellness",
    "accessories",
    "kitchenware",
  ],
  countryName: "India",
};

// ---------------------------------------------------------------------------
// Locale registry (extensible by consumer via registerSeedLocale)
// ---------------------------------------------------------------------------

const _localeRegistry = new Map<string, SeedLocaleData>([
  ["IN", INDIAN_LOCALE],
]);

/**
 * Register a locale data set for seed generation.
 * Consumer projects call this to provide market-specific pools.
 */
export function registerSeedLocale(
  countryCode: string,
  data: SeedLocaleData,
): void {
  _localeRegistry.set(countryCode, data);
}

/**
 * Returns the locale data for the current market (from baseline resolver).
 * Falls back to Indian locale data when no locale is registered for the
 * resolved country.
 */
export function getSeedLocale(): SeedLocaleData {
  const country = getDefaultCountry();
  return _localeRegistry.get(country) ?? INDIAN_LOCALE;
}

// ---------------------------------------------------------------------------
// Seed formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a numeric amount with the current market currency symbol.
 * Uses Indian-style formatting (lakh/crore grouping) for INR,
 * standard Western grouping otherwise.
 *
 * @example
 * formatSeedPrice(12490)  // "₹12,490" (INR baseline)
 * formatSeedPrice(999)    // "₹999"
 */
export function formatSeedPrice(amount: number): string {
  const profile = getMarketProfile();
  try {
    return new Intl.NumberFormat(profile.locale, {
      style: "currency",
      currency: profile.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback if Intl is unavailable or currency unknown
    return `${profile.currencySymbol}${amount.toLocaleString()}`;
  }
}

/**
 * Generate a phone number using the current market prefix.
 * Deterministic — same `n` always produces the same number.
 */
export function makeSeedPhone(n: number): string {
  const prefix = getDefaultPhonePrefix();
  const digits = ["6", "7", "8", "9"][n % 4];
  const middle = String((n * 98765 + 10000) % 90000).padStart(5, "0");
  const suffix = String((n * 54321 + 1000) % 10000).padStart(4, "0");
  return `${prefix} ${digits}${middle}${suffix}`;
}

/**
 * Pick a deterministic element from an array using a sequence number.
 */
export function pick<T>(arr: readonly T[], n: number): T {
  return arr[n % arr.length];
}

/**
 * Deterministic integer in [min, max] range based on n.
 */
export function irand(n: number, min: number, max: number): number {
  return min + (((n * 2_654_435_761) >>> 0) % (max - min + 1));
}
