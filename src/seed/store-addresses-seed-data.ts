import { getSeedLocale, getDefaultPhonePrefix } from "./seed-market-config";

const _locale = getSeedLocale();
const _phonePrefix = getDefaultPhonePrefix();

/**
 * Store Addresses Seed Data — Pokemon TCG Themed
 *
 * Sample pickup/warehouse addresses for demo stores.
 * Addresses stored as subcollection: stores/{storeSlug}/addresses/{addressId}
 * All address documents mapped to stores that exist in pokemon-stores-seed-data.ts.
 */

// --- Dynamic date helpers ---------------------------------------------------
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export interface StoreAddressSeedData {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  storeSlug: string;
}

export const storeAddressesSeedData: StoreAddressSeedData[] = [
  // ============================================
  // Misty's Water Card Shop Addresses
  // ============================================
  {
    id: "saddr-misty-main-1707400001",
    storeSlug: "store-mistys-water-cards-by-misty",
    label: "Cerulean Gym Vault",
    fullName: "Misty",
    phone: `${_phonePrefix}9876543211`,
    addressLine1: "Cerulean City Gym, 1 Cascade Badge Blvd",
    addressLine2: "Water Pokemon District",
    landmark: "Next to Cerulean City Bike Shop",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400069",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(600),
    updatedAt: daysAgo(600),
  },
  {
    id: "saddr-misty-pickup-1707400002",
    storeSlug: "store-mistys-water-cards-by-misty",
    label: "Card Pickup Point",
    fullName: "Misty",
    phone: `${_phonePrefix}9876543211`,
    addressLine1: "12, Cerulean Harbour Market",
    addressLine2: "Near Bike Road",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400050",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(580),
    updatedAt: daysAgo(580),
  },

  // ============================================
  // Surge's Electric Gym Shop Addresses
  // ============================================
  {
    id: "saddr-surge-main-1707400003",
    storeSlug: "store-surges-electric-gym-by-surge",
    label: "Vermilion Gym Storage",
    fullName: "Lt. Surge",
    phone: `${_phonePrefix}9988776655`,
    addressLine1: "Vermilion City Gym, 1 Thunder Badge Ave",
    addressLine2: "Electric Type District",
    landmark: "Near Vermilion Port",
    city: "Bangalore",
    state: "Karnataka",
    postalCode: "560001",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(500),
    updatedAt: daysAgo(500),
  },
  {
    id: "saddr-surge-warehouse-1707400004",
    storeSlug: "store-surges-electric-gym-by-surge",
    label: "Warehouse",
    fullName: "Lt. Surge",
    phone: `${_phonePrefix}9988776655`,
    addressLine1: "56, Vermilion Industrial Zone",
    addressLine2: "Port District",
    city: "Bangalore",
    state: "Karnataka",
    postalCode: "560038",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(480),
    updatedAt: daysAgo(480),
  },

  // ============================================
  // Blaine's Fire Shoppe Addresses
  // ============================================
  {
    id: "saddr-blaine-main-1707400005",
    storeSlug: "store-blaines-fire-shoppe-by-blaine",
    label: "Cinnabar Volcano Vault",
    fullName: "Blaine",
    phone: `${_phonePrefix}9876543213`,
    addressLine1: "Cinnabar Island Gym",
    addressLine2: "Volcano Road, Cinnabar City",
    landmark: "Near Pokemon Lab",
    city: "Hyderabad",
    state: "Telangana",
    postalCode: "500034",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(450),
    updatedAt: daysAgo(450),
  },
  {
    id: "saddr-blaine-pickup-1707400006",
    storeSlug: "store-blaines-fire-shoppe-by-blaine",
    label: "Fire Stone Pickup",
    fullName: "Blaine",
    phone: `${_phonePrefix}9876543213`,
    addressLine1: "8, Cinnabar Collectibles Market",
    addressLine2: "Near Fossil Restoration Centre",
    city: "Hyderabad",
    state: "Telangana",
    postalCode: "500081",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(430),
    updatedAt: daysAgo(430),
  },
];
