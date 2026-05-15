import { getSeedLocale, makeSeedPhone, getDefaultPhonePrefix } from "./seed-market-config";

const _locale = getSeedLocale();
const _phonePrefix = getDefaultPhonePrefix();

/**
 * Addresses Seed Data — Pokemon TCG Themed
 *
 * Sample user addresses for development and testing.
 * Addresses stored as subcollection: users/{userId}/addresses/{addressId}
 * All address documents mapped to users that exist in pokemon-users-seed-data.ts.
 */

// --- Dynamic date helpers ---------------------------------------------------
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export interface AddressSeedData {
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
  userId: string;
}

export const addressesSeedData: AddressSeedData[] = [
  // ============================================
  // Ash Ketchum's Addresses
  // ============================================
  {
    id: "addr-ash-home-1707400001",
    userId: "user-ash-ketchum-pallet-ash",
    label: "Home",
    fullName: "Ash Ketchum",
    phone: `${_phonePrefix}9111111111`,
    addressLine1: "Flat 302, Crystal Towers",
    addressLine2: "MG Road, Andheri East",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400069",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(753),
    updatedAt: daysAgo(753),
  },
  {
    id: "addr-ash-office-1707400002",
    userId: "user-ash-ketchum-pallet-ash",
    label: "Pallet Town",
    fullName: "Ash Ketchum",
    phone: `${_phonePrefix}9111111111`,
    addressLine1: "1, Pallet Town Road",
    addressLine2: "Near Pokemon Lab",
    city: "Pune",
    state: "Maharashtra",
    postalCode: "411001",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(738),
    updatedAt: daysAgo(738),
  },

  // ============================================
  // Gary Oak's Addresses
  // ============================================
  {
    id: "addr-gary-home-1707400004",
    userId: "user-gary-oak-gary",
    label: "Home",
    fullName: "Gary Oak",
    phone: `${_phonePrefix}9876543212`,
    addressLine1: "Villa 23, Whitefield Gardens",
    addressLine2: "Marathahalli",
    city: "Bangalore",
    state: "Karnataka",
    postalCode: "560037",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(729),
    updatedAt: daysAgo(729),
  },
  {
    id: "addr-gary-research-1707400005",
    userId: "user-gary-oak-gary",
    label: "Research Lab",
    fullName: "Gary Oak",
    phone: `${_phonePrefix}9876543212`,
    addressLine1: "Oak Pokemon Research Lab",
    addressLine2: "Pallet Town Research District",
    city: "Bangalore",
    state: "Karnataka",
    postalCode: "560103",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(703),
    updatedAt: daysAgo(703),
  },

  // ============================================
  // Brock's Addresses
  // ============================================
  {
    id: "addr-brock-home-1707400006",
    userId: "user-brock-pewter-brock",
    label: "Gym",
    fullName: "Brock",
    phone: `${_phonePrefix}9876543213`,
    addressLine1: "Pewter City Gym, MG Road",
    addressLine2: "Rock Type District",
    landmark: "Near Boulder Badge Museum",
    city: "Bangalore",
    state: "Karnataka",
    postalCode: "560001",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(688),
    updatedAt: daysAgo(688),
  },
  {
    id: "addr-brock-home2-1707400007",
    userId: "user-brock-pewter-brock",
    label: "Family Home",
    fullName: "Brock",
    phone: `${_phonePrefix}9876543213`,
    addressLine1: "56, Indiranagar 100ft Road",
    addressLine2: "Near CMH Hospital",
    city: "Bangalore",
    state: "Karnataka",
    postalCode: "560038",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(423),
    updatedAt: daysAgo(423),
  },

  // ============================================
  // Sabrina's Addresses
  // ============================================
  {
    id: "addr-sabrina-home-1707400008",
    userId: "user-sabrina-psychic-sabrina",
    label: "Gym",
    fullName: "Sabrina",
    phone: `${_phonePrefix}9876543260`,
    addressLine1: "Saffron City Gym",
    addressLine2: "Psychic Street",
    landmark: "Near Silph Co.",
    city: "Hyderabad",
    state: "Telangana",
    postalCode: "500034",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(360),
    updatedAt: daysAgo(360),
  },

  // ============================================
  // Erika's Addresses
  // ============================================
  {
    id: "addr-erika-home-1707400010",
    userId: "user-erika-celadon-erika",
    label: "Gym",
    fullName: "Erika",
    phone: `${_phonePrefix}9876543270`,
    addressLine1: "Celadon City Gym",
    addressLine2: "Grass Type Garden District",
    city: "Ahmedabad",
    state: "Gujarat",
    postalCode: "380009",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(294),
    updatedAt: daysAgo(294),
  },

  // ============================================
  // Professor Oak's Addresses
  // ============================================
  {
    id: "addr-oak-lab-1707400012",
    userId: "user-professor-oak-prof",
    label: "Lab",
    fullName: "Professor Samuel Oak",
    phone: `${_phonePrefix}9876543280`,
    addressLine1: "Oak Pokemon Research Lab",
    addressLine2: "North of Pallet Town",
    landmark: "Opposite Pallet Town Entrance",
    city: "Kochi",
    state: "Kerala",
    postalCode: "682001",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(221),
    updatedAt: daysAgo(221),
  },

  // ============================================
  // Moderator's Address
  // ============================================
  {
    id: "addr-mod-primary-1707400014",
    userId: "user-moderator-mod-user",
    label: "Primary",
    fullName: "Content Moderator",
    phone: `${_phonePrefix}9876543220`,
    addressLine1: "LetItRip Office, 9th Floor",
    addressLine2: "BKC, G Block",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400051",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(739),
    updatedAt: daysAgo(739),
  },

  // ============================================
  // Admin User's Addresses (user-admin-letitrip)
  // ============================================
  {
    id: "addr-admin-primary-1707400017",
    userId: "user-admin-letitrip",
    label: "Office (LetItRip HQ)",
    fullName: "LetItRip Admin",
    phone: `${_phonePrefix}9876500000`,
    addressLine1: "LetItRip HQ, 10th Floor",
    addressLine2: "BKC, G Block",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400051",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(399),
    updatedAt: daysAgo(30),
  },
  {
    id: "addr-admin-home-1707400018",
    userId: "user-admin-letitrip",
    label: "Home",
    fullName: "LetItRip Admin",
    phone: `${_phonePrefix}9876500000`,
    addressLine1: "A-1204, Kalpataru Horizon",
    addressLine2: "S.K. Ahire Marg, Worli",
    landmark: "Near Worli Sea Face",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400018",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(300),
    updatedAt: daysAgo(30),
  },
];
