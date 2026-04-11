// ─── Store ────────────────────────────────────────────────────────────────────

export type StoreStatus = "pending" | "active" | "suspended" | "rejected";

export interface SellerStore {
  id: string;
  storeSlug: string;
  ownerId: string;
  storeName: string;
  storeDescription?: string;
  storeCategory?: string;
  storeLogoURL?: string;
  storeBannerURL?: string;
  status: StoreStatus;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  returnPolicy?: string;
  shippingPolicy?: string;
  isPublic: boolean;
  isVacationMode?: boolean;
  vacationMessage?: string;
  stats?: {
    totalProducts: number;
    itemsSold: number;
    totalReviews: number;
    averageRating?: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Payout ───────────────────────────────────────────────────────────────────

export type PayoutStatus = "pending" | "processing" | "completed" | "failed";
export type PayoutPaymentMethod = "bank_transfer" | "upi";

export interface PayoutBankAccount {
  accountHolderName: string;
  accountNumberMasked: string;
  ifscCode: string;
  bankName: string;
}

export interface PayoutRecord {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  amount: number;
  grossAmount: number;
  platformFee: number;
  platformFeeRate: number;
  currency: string;
  status: PayoutStatus;
  paymentMethod: PayoutPaymentMethod;
  bankAccount?: PayoutBankAccount;
  upiId?: string;
  notes?: string;
  adminNote?: string;
  orderIds: string[];
  gatewayFee?: number;
  gstAmount?: number;
  isAutomatic?: boolean;
  requestedAt: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Payout settings ──────────────────────────────────────────────────────────

export interface SellerPayoutSettings {
  preferredMethod: PayoutPaymentMethod;
  bankAccount?: PayoutBankAccount;
  upiId?: string;
  autoPayoutEnabled: boolean;
  autoPayoutThreshold: number;
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export interface SellerDashboardStats {
  totalRevenue: number;
  pendingPayouts: number;
  activeListings: number;
  totalOrders: number;
  pendingOrders: number;
  averageRating?: number;
  currency: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface SellerRevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface SellerAnalytics {
  revenueData: SellerRevenueDataPoint[];
  topProducts: Array<{
    productId: string;
    title: string;
    revenue: number;
    orders: number;
  }>;
  conversionRate: number;
  period: string;
}

export interface SellerAnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  publishedProducts: number;
}

export interface SellerAnalyticsMonthEntry {
  month: string;
  orders: number;
  revenue: number;
}

export interface SellerAnalyticsTopProduct {
  productId: string;
  title: string;
  revenue: number;
  orders: number;
  mainImage?: string;
}

// ─── List responses ───────────────────────────────────────────────────────────

export interface PayoutListResponse {
  items: PayoutRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SellerListResponse {
  items: SellerStore[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface UpdateSellerStoreInput {
  storeName?: string;
  storeDescription?: string;
  storeCategory?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: SellerStore["socialLinks"];
  returnPolicy?: string;
  shippingPolicy?: string;
  isPublic?: boolean;
  isVacationMode?: boolean;
  vacationMessage?: string;
}

export interface RequestPayoutInput {
  amount: number;
  currency: string;
  paymentMethod: PayoutPaymentMethod;
  bankAccount?: PayoutBankAccount;
  upiId?: string;
  notes?: string;
  orderIds: string[];
}
