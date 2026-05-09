import { getSeedLocale, getDefaultPhonePrefix } from "./seed-market-config";

const _locale = getSeedLocale();
const _phonePrefix = getDefaultPhonePrefix();

/**
 * Store Addresses Seed Data
 *
 * Pickup/warehouse addresses for all 8 demo stores.
 * Addresses stored as subcollection: stores/{storeSlug}/addresses/{addressId}
 * All storeSlug values must match exactly the ids in stores-seed-data.ts.
 */

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
  // ── store-letitrip-official ───────────────────────────────────────────────
  {
    id: "saddr-letitrip-hq-001",
    storeSlug: "store-letitrip-official",
    label: "LetItRip HQ",
    fullName: "LetItRip Admin",
    phone: `${_phonePrefix}9876500000`,
    addressLine1: "12, Collector's Lane, Okhla Phase III",
    addressLine2: "Tech City Industrial Area",
    landmark: "Near Okhla Industrial Estate Gate 3",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110020",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(1),
  },
  {
    id: "saddr-letitrip-warehouse-002",
    storeSlug: "store-letitrip-official",
    label: "Fulfilment Warehouse",
    fullName: "LetItRip Admin",
    phone: `${_phonePrefix}9876500000`,
    addressLine1: "Unit 7B, Connaught Logistics Park, Lajpat Nagar",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110024",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(350),
    updatedAt: daysAgo(30),
  },

  // ── store-pokemon-palace ──────────────────────────────────────────────────
  {
    id: "saddr-pokemon-palace-main-001",
    storeSlug: "store-pokemon-palace",
    label: "Pokémon Palace HQ",
    fullName: "Aryan Kapoor",
    phone: `${_phonePrefix}9876501001`,
    addressLine1: "Flat 4B, Andheri Collectibles Centre, Link Road",
    addressLine2: "Andheri West",
    landmark: "Near Andheri Metro Station",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400053",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(380),
    updatedAt: daysAgo(5),
  },
  {
    id: "saddr-pokemon-palace-pickup-002",
    storeSlug: "store-pokemon-palace",
    label: "Local Pickup Point",
    fullName: "Aryan Kapoor",
    phone: `${_phonePrefix}9876501001`,
    addressLine1: "Shop 12, Juhu Card Market, Juhu Tara Road",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400049",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(300),
    updatedAt: daysAgo(10),
  },

  // ── store-cardgame-hub ────────────────────────────────────────────────────
  {
    id: "saddr-cardgame-hub-main-001",
    storeSlug: "store-cardgame-hub",
    label: "CardGame Hub Office",
    fullName: "Nisha Reddy",
    phone: `${_phonePrefix}9876502002`,
    addressLine1: "Plot 23, Banjara Hills TCG District, Road No. 12",
    addressLine2: "Near Banjara Hills Club",
    city: "Hyderabad",
    state: "Telangana",
    postalCode: "500034",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(350),
    updatedAt: daysAgo(3),
  },

  // ── store-diecast-depot ───────────────────────────────────────────────────
  {
    id: "saddr-diecast-depot-main-001",
    storeSlug: "store-diecast-depot",
    label: "Diecast Depot Store",
    fullName: "Vikram Mehta",
    phone: `${_phonePrefix}9876503003`,
    addressLine1: "Shop 7, Lajpat Nagar Collectors Market, Central Market",
    addressLine2: "Block A, Lajpat Nagar II",
    landmark: "Opposite Lajpat Nagar Metro Station",
    city: "New Delhi",
    state: "Delhi",
    postalCode: "110024",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(320),
    updatedAt: daysAgo(2),
  },
  {
    id: "saddr-diecast-depot-storage-002",
    storeSlug: "store-diecast-depot",
    label: "Climate-Controlled Storage",
    fullName: "Vikram Mehta",
    phone: `${_phonePrefix}9876503003`,
    addressLine1: "Unit 14, Noida Industrial Estate, Sector 63",
    city: "Noida",
    state: "Uttar Pradesh",
    postalCode: "201301",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(280),
    updatedAt: daysAgo(15),
  },

  // ── store-beyblade-arena ──────────────────────────────────────────────────
  {
    id: "saddr-beyblade-arena-main-001",
    storeSlug: "store-beyblade-arena",
    label: "Beyblade Arena Showroom",
    fullName: "Rohit Joshi",
    phone: `${_phonePrefix}9876504004`,
    addressLine1: "2nd Floor, FC Road Hobby Complex, Near Fergusson College",
    city: "Pune",
    state: "Maharashtra",
    postalCode: "411004",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(290),
    updatedAt: daysAgo(2),
  },

  // ── store-tokyo-toys-india ────────────────────────────────────────────────
  {
    id: "saddr-tokyo-toys-main-001",
    storeSlug: "store-tokyo-toys-india",
    label: "Tokyo Toys India Studio",
    fullName: "Priya Singh",
    phone: `${_phonePrefix}9876505005`,
    addressLine1: "Door 4B, Nungambakkam Anime Hub, Nungambakkam High Road",
    landmark: "Near Nungambakkam Metro Station",
    city: "Chennai",
    state: "Tamil Nadu",
    postalCode: "600034",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(260),
    updatedAt: daysAgo(1),
  },
  {
    id: "saddr-tokyo-toys-pickup-002",
    storeSlug: "store-tokyo-toys-india",
    label: "Local Pickup (T. Nagar)",
    fullName: "Priya Singh",
    phone: `${_phonePrefix}9876505005`,
    addressLine1: "Shop 8, T. Nagar Collectibles Row, Usman Road",
    city: "Chennai",
    state: "Tamil Nadu",
    postalCode: "600017",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(5),
  },

  // ── store-gundam-galaxy ───────────────────────────────────────────────────
  {
    id: "saddr-gundam-galaxy-main-001",
    storeSlug: "store-gundam-galaxy",
    label: "Gundam Galaxy Workshop",
    fullName: "Amit Sharma",
    phone: `${_phonePrefix}9876506006`,
    addressLine1: "3rd Floor, Koramangala Hobby Hub, 80 Feet Road",
    addressLine2: "Koramangala 4th Block",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560034",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(230),
    updatedAt: daysAgo(2),
  },

  // ── store-vintage-vault ───────────────────────────────────────────────────
  {
    id: "saddr-vintage-vault-main-001",
    storeSlug: "store-vintage-vault",
    label: "Vintage Vault Gallery",
    fullName: "Kavya Iyer",
    phone: `${_phonePrefix}9876507007`,
    addressLine1: "14, Park Street Antiques Lane, Park Street",
    landmark: "Near Park Street Metro",
    city: "Kolkata",
    state: "West Bengal",
    postalCode: "700016",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(3),
  },
  {
    id: "saddr-vintage-vault-storage-002",
    storeSlug: "store-vintage-vault",
    label: "Climate-Controlled Archive",
    fullName: "Kavya Iyer",
    phone: `${_phonePrefix}9876507007`,
    addressLine1: "Unit 3, Salt Lake City Collector Storage, Sector V",
    city: "Kolkata",
    state: "West Bengal",
    postalCode: "700091",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(180),
    updatedAt: daysAgo(10),
  },
];
