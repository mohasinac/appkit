import { getSeedLocale, makeSeedPhone, getDefaultPhonePrefix } from "./seed-market-config";

const _locale = getSeedLocale();
const _phonePrefix = getDefaultPhonePrefix();

/**
 * Addresses Seed Data
 * Sample user addresses for development and testing
 *
 * Addresses stored as subcollection: users/{userId}/addresses/{addressId}
 * All address documents mapped to users that exist in users-seed-data.ts.
 */

// ─── Dynamic date helpers ───────────────────────────────────────────────────
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
  userId: string; // Parent user reference
}

export const addressesSeedData: AddressSeedData[] = [
  // ============================================
  // John Doe's Addresses
  // ============================================
  {
    id: "addr-john-home-1707400001",
    userId: "user-john-doe-johndoe",
    label: "Home",
    fullName: "John Doe",
    phone: `${_phonePrefix}9876543211`,
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
    id: "addr-john-office-1707400002",
    userId: "user-john-doe-johndoe",
    label: "Office",
    fullName: "John Doe",
    phone: `${_phonePrefix}9876543211`,
    addressLine1: "Tech Park, 5th Floor",
    addressLine2: "Powai Link Road",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400076",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(738),
    updatedAt: daysAgo(738),
  },
  {
    id: "addr-john-parents-1707400003",
    userId: "user-john-doe-johndoe",
    label: "Parents' Home",
    fullName: "Rakesh Doe",
    phone: `${_phonePrefix}2066554433`,
    addressLine1: "House No. 45, Sector 12",
    addressLine2: "Near Central Park",
    landmark: "Opposite State Bank",
    city: "Pune",
    state: "Maharashtra",
    postalCode: "411038",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(698),
    updatedAt: daysAgo(698),
  },

  // ============================================
  // Jane Smith's Addresses
  // ============================================
  {
    id: "addr-jane-home-1707400004",
    userId: "user-jane-smith-janes",
    label: "Home",
    fullName: "Jane Smith",
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
    id: "addr-jane-work-1707400005",
    userId: "user-jane-smith-janes",
    label: "Work",
    fullName: "Jane Smith",
    phone: `${_phonePrefix}9876543212`,
    addressLine1: "Block C, Tech Hub",
    addressLine2: "Outer Ring Road",
    city: "Bangalore",
    state: "Karnataka",
    postalCode: "560103",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(703),
    updatedAt: daysAgo(703),
  },

  // ============================================
  // Mike Johnson's Addresses
  // ============================================
  {
    id: "addr-mike-home-1707400006",
    userId: "user-mike-johnson-mikejohn",
    label: "Home",
    fullName: "Mike Johnson",
    phone: `${_phonePrefix}9876543213`,
    addressLine1: "78, MG Road",
    addressLine2: "Brigade Road Area",
    landmark: "Near Forum Mall",
    city: "Bangalore",
    state: "Karnataka",
    postalCode: "560001",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(688),
    updatedAt: daysAgo(688),
  },
  {
    id: "addr-mike-shipping-1707400007",
    userId: "user-mike-johnson-mikejohn",
    label: "Alternative Shipping",
    fullName: "Mike Johnson",
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
  // Priya Sharma's Addresses
  // ============================================
  {
    id: "addr-priya-home-1707400008",
    userId: "user-priya-sharma-priya",
    label: "Home",
    fullName: "Priya Sharma",
    phone: `${_phonePrefix}9876543260`,
    addressLine1: "34, Banjara Hills",
    addressLine2: "Road No. 12",
    landmark: "Near Café Coffee Day",
    city: "Hyderabad",
    state: "Telangana",
    postalCode: "500034",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(360),
    updatedAt: daysAgo(360),
  },
  {
    id: "addr-priya-work-1707400009",
    userId: "user-priya-sharma-priya",
    label: "Office",
    fullName: "Priya Sharma",
    phone: `${_phonePrefix}9876543260`,
    addressLine1: "DLF Cyber City, Tower 11",
    addressLine2: "HITEC City",
    city: "Hyderabad",
    state: "Telangana",
    postalCode: "500081",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(342),
    updatedAt: daysAgo(342),
  },

  // ============================================
  // Raj Patel's Addresses
  // ============================================
  {
    id: "addr-raj-home-1707400010",
    userId: "user-raj-patel-rajpatel",
    label: "Home",
    fullName: "Raj Patel",
    phone: `${_phonePrefix}9876543270`,
    addressLine1: "12, MG Road",
    addressLine2: "Navrangpura",
    city: "Ahmedabad",
    state: "Gujarat",
    postalCode: "380009",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(294),
    updatedAt: daysAgo(294),
  },
  {
    id: "addr-raj-business-1707400011",
    userId: "user-raj-patel-rajpatel",
    label: "Business",
    fullName: "Raj Patel Enterprises",
    phone: `${_phonePrefix}2712233445`,
    addressLine1: "Shop 45, GIDC Industrial Estate",
    addressLine2: "Phase 2, Vatva",
    city: "Ahmedabad",
    state: "Gujarat",
    postalCode: "382445",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(267),
    updatedAt: daysAgo(267),
  },

  // ============================================
  // Vikram Nair's Addresses
  // ============================================
  {
    id: "addr-meera-home-1707400012",
    userId: "user-vikram-nair-vikram",
    label: "Home",
    fullName: "Vikram Nair",
    phone: `${_phonePrefix}9876543280`,
    addressLine1: "88/4, MG Road",
    addressLine2: "Near Broadway",
    landmark: "Opposite Ernakulam Junction",
    city: "Kochi",
    state: "Kerala",
    postalCode: "682001",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(221),
    updatedAt: daysAgo(221),
  },
  {
    id: "addr-meera-parents-1707400013",
    userId: "user-vikram-nair-vikram",
    label: "Parents",
    fullName: "Suresh Nair",
    phone: `${_phonePrefix}4842334455`,
    addressLine1: "TC 25/1104, Pulimoodu",
    addressLine2: "Near Padmatheertham",
    city: "Thiruvananthapuram",
    state: "Kerala",
    postalCode: "695001",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(180),
    updatedAt: daysAgo(180),
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
  // Admin User's Address
  // ============================================
  {
    id: "addr-admin-primary-1707400017",
    userId: "user-admin-user-admin",
    label: "Primary",
    fullName: "Admin User",
    phone: `${_phonePrefix}9876543210`,
    addressLine1: "LetItRip HQ, 10th Floor",
    addressLine2: "BKC, G Block",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400051",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(799),
    updatedAt: daysAgo(799),
  },

  // ============================================
  // Jane Smith — Delhi address (matches her orders)
  // ============================================
  {
    id: "addr-jane-delhi-1707400018",
    userId: "user-jane-smith-janes",
    label: "Delhi Flat",
    fullName: "Jane Smith",
    phone: `${_phonePrefix}9876543212`,
    addressLine1: "Flat 7B, Lajpat Nagar II",
    addressLine2: "Near Central Market",
    city: "New Delhi",
    state: "Delhi",
    postalCode: "110024",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(128),
    updatedAt: daysAgo(128),
  },

  // ============================================
  // Fashion Boutique's Business Address
  // ============================================
  {
    id: "addr-fashion-boutique-biz-1707400019",
    userId: "user-fashion-boutique-fashionb",
    label: "Studio",
    fullName: "Fashion Boutique",
    phone: `${_phonePrefix}9876543240`,
    addressLine1: "Studio 14, Linking Road",
    addressLine2: "Bandra West",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400050",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(646),
    updatedAt: daysAgo(646),
  },

  // ============================================
  // Home Essentials' Warehouse Address
  // ============================================
  {
    id: "addr-home-essentials-warehouse-1707400020",
    userId: "user-home-essentials-homeesse",
    label: "Warehouse",
    fullName: "Home Essentials",
    phone: `${_phonePrefix}9876543250`,
    addressLine1: "Plot 22, RIICO Industrial Area",
    addressLine2: "Sitapura",
    city: "Jaipur",
    state: "Rajasthan",
    postalCode: "302022",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(616),
    updatedAt: daysAgo(616),
  },

  // ============================================
  // Ananya Bose's Address
  // ============================================
  {
    id: "addr-ananya-home-1707400021",
    userId: "user-ananya-bose-ananya",
    label: "Home",
    fullName: "Ananya Bose",
    phone: `${_phonePrefix}9876543291`,
    addressLine1: "43, Lake Town, Block B",
    addressLine2: "Near Bidhan Nagar",
    city: "Kolkata",
    state: "West Bengal",
    postalCode: "700089",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(145),
    updatedAt: daysAgo(145),
  },

  // ============================================
  // Pooja Mehta's Address
  // ============================================
  {
    id: "addr-pooja-home-1707400022",
    userId: "user-pooja-mehta-pooja",
    label: "Home",
    fullName: "Pooja Mehta",
    phone: `${_phonePrefix}9876543292`,
    addressLine1: "15, Pali Hill",
    addressLine2: "Bandra West",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400050",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(119),
    updatedAt: daysAgo(119),
  },

  // ============================================
  // Ravi Kumar's Address
  // ============================================
  {
    id: "addr-ravi-home-1707400023",
    userId: "user-ravi-kumar-ravi",
    label: "Home",
    fullName: "Ravi Kumar",
    phone: `${_phonePrefix}9876543293`,
    addressLine1: "78, Sector 20, Chandigarh",
    addressLine2: "",
    landmark: "Near Elante Mall",
    city: "Chandigarh",
    state: "Punjab",
    postalCode: "160020",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(98),
    updatedAt: daysAgo(98),
  },

  // ============================================
  // Sneha Gupta's Address
  // ============================================
  {
    id: "addr-sneha-home-1707400024",
    userId: "user-sneha-gupta-sneha",
    label: "Home",
    fullName: "Sneha Gupta",
    phone: `${_phonePrefix}9876543294`,
    addressLine1: "32, Gomti Nagar, Sector 3",
    addressLine2: "",
    city: "Lucknow",
    state: "Uttar Pradesh",
    postalCode: "226010",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(63),
    updatedAt: daysAgo(63),
  },
];

