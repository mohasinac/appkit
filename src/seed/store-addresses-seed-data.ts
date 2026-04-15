/**
 * Store Addresses Seed Data
 * Sample pickup/warehouse addresses for demo stores
 *
 * Addresses stored as subcollection: stores/{storeSlug}/addresses/{addressId}
 * All address documents mapped to stores that exist in stores-seed-data.ts.
 */

// ─── Dynamic date helpers ───────────────────────────────────────────────────
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
  storeSlug: string; // Parent store reference
}

export const storeAddressesSeedData: StoreAddressSeedData[] = [
  // ============================================
  // FigureVault JP Addresses
  // ============================================
  {
    id: "saddr-fv-warehouse-1707400001",
    storeSlug: "store-figurevault-jp-by-figurevault",
    label: "Main Warehouse",
    fullName: "Rajesh Sharma",
    phone: "+919876543210",
    addressLine1: "Unit 12, Goregaon Industrial Estate",
    addressLine2: "SV Road, Goregaon West",
    landmark: "Near Film City",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400062",
    country: "India",
    isDefault: true,
    createdAt: daysAgo(600),
    updatedAt: daysAgo(600),
  },
  {
    id: "saddr-fv-showroom-1707400002",
    storeSlug: "store-figurevault-jp-by-figurevault",
    label: "Showroom",
    fullName: "Rajesh Sharma",
    phone: "+919876543210",
    addressLine1: "Shop 5, Anime Plaza",
    addressLine2: "Linking Road, Bandra West",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400050",
    country: "India",
    isDefault: false,
    createdAt: daysAgo(580),
    updatedAt: daysAgo(580),
  },

  // ============================================
  // AnimeCraft Apparel Addresses
  // ============================================
  {
    id: "saddr-ac-warehouse-1707400003",
    storeSlug: "store-animecraft-apparel-by-animecraft",
    label: "Production Unit",
    fullName: "Priya Verma",
    phone: "+919988776655",
    addressLine1: "Plot 34, Okhla Industrial Area, Phase 2",
    addressLine2: "New Friends Colony",
    city: "New Delhi",
    state: "Delhi",
    postalCode: "110025",
    country: "India",
    isDefault: true,
    createdAt: daysAgo(500),
    updatedAt: daysAgo(500),
  },
  {
    id: "saddr-ac-pickup-1707400004",
    storeSlug: "store-animecraft-apparel-by-animecraft",
    label: "Pickup Point",
    fullName: "Priya Verma",
    phone: "+919988776655",
    addressLine1: "A-12, Sarojini Nagar Market",
    city: "New Delhi",
    state: "Delhi",
    postalCode: "110023",
    country: "India",
    isDefault: false,
    createdAt: daysAgo(480),
    updatedAt: daysAgo(480),
  },

  // ============================================
  // OtakuShelf Co Addresses
  // ============================================
  {
    id: "saddr-os-warehouse-1707400005",
    storeSlug: "store-otakushelf-co-by-otakushelf",
    label: "Central Warehouse",
    fullName: "Vikram Patel",
    phone: "+919123456789",
    addressLine1: "Warehouse 7, Electronic City Phase 1",
    addressLine2: "Hosur Road",
    landmark: "Opposite Infosys Gate 4",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560100",
    country: "India",
    isDefault: true,
    createdAt: daysAgo(450),
    updatedAt: daysAgo(450),
  },
];

