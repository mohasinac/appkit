/**
 * SEO-Friendly ID Generators
 *
 * Every generator accepts an optional `customId` override. When supplied and
 * non-empty it is returned as-is, letting callers bring their own IDs without
 * duplicating generator logic.
 */

import { slugify } from "./string.formatter";

function generateRandomString(length: number = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const indices = new Uint8Array(length);
  globalThis.crypto.getRandomValues(indices);
  return Array.from(indices, (i) => chars[i % chars.length]).join("");
}

function getTimestamp(): string {
  return Date.now().toString();
}

// â”€â”€â”€ Category â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GenerateCategoryIdInput {
  name: string;
  parentName?: string;
  rootName?: string;
  customId?: string;
}
export function generateCategoryId(input: GenerateCategoryIdInput): string {
  if (input.customId?.trim()) return input.customId.trim();
  const nameSlug = slugify(input.name);
  if (input.parentName)
    return `category-${nameSlug}-${slugify(input.parentName)}`;
  if (input.rootName) return `category-${nameSlug}-${slugify(input.rootName)}`;
  return `category-${nameSlug}`;
}

// â”€â”€â”€ User â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GenerateUserIdInput {
  firstName: string;
  lastName: string;
  email: string;
  customId?: string;
}
export function generateUserId(input: GenerateUserIdInput): string {
  if (input.customId?.trim()) return input.customId.trim();
  const firstSlug = slugify(input.firstName);
  const lastSlug = slugify(input.lastName);
  const emailPrefix = input.email.split("@")[0].toLowerCase().substring(0, 8);
  const emailSlug = slugify(emailPrefix);
  return `user-${firstSlug}-${lastSlug}-${emailSlug}`;
}

// â”€â”€â”€ Product â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GenerateProductIdInput {
  name: string;
  category: string;
  condition: "new" | "used" | "refurbished";
  sellerName: string;
  count?: number;
  customId?: string;
}
export function generateProductId(input: GenerateProductIdInput): string {
  if (input.customId?.trim()) return input.customId.trim();
  const count = input.count || 1;
  return `product-${slugify(input.name)}-${slugify(input.category)}-${input.condition}-${slugify(input.sellerName)}-${count}`;
}

// â”€â”€â”€ Auction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GenerateAuctionIdInput {
  name: string;
  category: string;
  condition: "new" | "used" | "refurbished";
  sellerName: string;
  count?: number;
  customId?: string;
}
export function generateAuctionId(input: GenerateAuctionIdInput): string {
  if (input.customId?.trim()) return input.customId.trim();
  const count = input.count || 1;
  return `auction-${slugify(input.name)}-${slugify(input.category)}-${input.condition}-${slugify(input.sellerName)}-${count}`;
}

// â”€â”€â”€ Pre-order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GeneratePreOrderIdInput {
  name: string;
  category: string;
  condition: "new" | "used" | "refurbished";
  sellerName: string;
  count?: number;
  customId?: string;
}
export function generatePreOrderId(input: GeneratePreOrderIdInput): string {
  if (input.customId?.trim()) return input.customId.trim();
  const count = input.count || 1;
  return `preorder-${slugify(input.name)}-${slugify(input.category)}-${input.condition}-${slugify(input.sellerName)}-${count}`;
}

// â”€â”€â”€ Review â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GenerateReviewIdInput {
  productName: string;
  userFirstName: string;
  date?: Date;
  customId?: string;
}
export function generateReviewId(input: GenerateReviewIdInput): string {
  if (input.customId?.trim()) return input.customId.trim();
  const date = input.date || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `review-${slugify(input.productName)}-${slugify(input.userFirstName)}-${y}${m}${d}`;
}

// â”€â”€â”€ Order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GenerateOrderIdInput {
  productCount: number;
  date?: Date;
  customId?: string;
}
export function generateOrderId(input: GenerateOrderIdInput): string {
  if (input.customId?.trim()) return input.customId.trim();
  const date = input.date || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `order-${input.productCount}-${y}${m}${d}-${generateRandomString(6)}`;
}

// â”€â”€â”€ FAQ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GenerateFAQIdInput {
  category: string;
  question: string;
  customId?: string;
}
export function generateFAQId(input: GenerateFAQIdInput): string {
  if (input.customId?.trim()) return input.customId.trim();
  return `faq-${slugify(input.category)}-${slugify(input.question).substring(0, 50)}`;
}

// â”€â”€â”€ Coupon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function generateCouponId(code: string, customId?: string): string {
  if (customId?.trim()) return customId.trim();
  return `coupon-${code.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
}

// â”€â”€â”€ Carousel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GenerateCarouselIdInput {
  title: string;
  customId?: string;
}
export function generateCarouselId(input: GenerateCarouselIdInput): string {
  if (input.customId?.trim()) return input.customId.trim();
  return `carousel-${slugify(input.title).substring(0, 30)}-${getTimestamp()}`;
}

// â”€â”€â”€ Homepage section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GenerateHomepageSectionIdInput {
  type: string;
  customId?: string;
}
export function generateHomepageSectionId(
  input: GenerateHomepageSectionIdInput,
): string {
  if (input.customId?.trim()) return input.customId.trim();
  return `section-${slugify(input.type)}-${getTimestamp()}`;
}

// â”€â”€â”€ Bid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GenerateBidIdInput {
  productName: string;
  userFirstName: string;
  date?: Date;
  random?: string;
  customId?: string;
}
export function generateBidId(input: GenerateBidIdInput): string {
  if (input.customId?.trim()) return input.customId.trim();
  const date = input.date || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const random = input.random || generateRandomString(6);
  return `bid-${slugify(input.productName).substring(0, 30)}-${slugify(input.userFirstName)}-${y}${m}${d}-${random}`;
}

// â”€â”€â”€ Blog post â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GenerateBlogPostIdInput {
  title: string;
  category: string;
  status?: "draft" | "published" | "archived";
  customId?: string;
}
export function generateBlogPostId(input: GenerateBlogPostIdInput): string {
  if (input.customId?.trim()) return input.customId.trim();
  const titleSlug = slugify(input.title).substring(0, 40).replace(/-+$/, "");
  const categorySlug = slugify(input.category);
  const base = `blog-${titleSlug}-${categorySlug}`;
  if (input.status && input.status !== "published")
    return `${base}-${input.status}`;
  return base;
}

// â”€â”€â”€ Payout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GeneratePayoutIdInput {
  sellerName: string;
  date?: Date;
  customId?: string;
}
export function generatePayoutId(input: GeneratePayoutIdInput): string {
  if (input.customId?.trim()) return input.customId.trim();
  const sellerSlug = slugify(input.sellerName)
    .substring(0, 25)
    .replace(/-+$/, "");
  const date = input.date || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `payout-${sellerSlug}-${y}${m}${d}-${generateRandomString(6)}`;
}

// ─── Offer ────────────────────────────────────────────────────────────────────

export interface GenerateOfferIdInput {
  productId: string;
  buyerUid: string;
  date?: Date;
  customId?: string;
}

export function generateOfferId(input: GenerateOfferIdInput): string {
  if (input.customId?.trim()) return input.customId.trim();
  const productPrefix = slugify(input.productId).substring(0, 20).replace(/-+$/, "");
  const buyerPrefix = slugify(input.buyerUid).substring(0, 12).replace(/-+$/, "");
  const date = input.date || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `offer-${productPrefix}-${buyerPrefix}-${y}${m}${d}-${generateRandomString(6)}`;
}

// ─── ID existence helpers ─────────────────────────────────────────────────────

export async function idExists(
  getExistingId: () => Promise<unknown>,
): Promise<boolean> {
  try {
    const doc = await getExistingId();
    return !!doc;
  } catch {
    return false;
  }
}

export async function generateUniqueId(
  generateId: (count: number) => string,
  checkExists: (id: string) => Promise<boolean>,
  maxAttempts: number = 100,
): Promise<string> {
  for (let count = 1; count <= maxAttempts; count++) {
    const id = generateId(count);
    if (!(await checkExists(id))) return id;
  }
  return `${generateId(maxAttempts)}-${generateRandomString(4)}`;
}

// ─── Barcode / QR helpers ─────────────────────────────────────────────────────

export function generateBarcodeFromId(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length >= 12) return digits.slice(0, 12);
  return digits.padEnd(12, "0");
}

export function generateQRCodeData(id: string, baseUrl: string): string {
  if (id.startsWith("product-")) return `${baseUrl}/products/${id}`;
  if (id.startsWith("auction-")) return `${baseUrl}/auctions/${id}`;
  if (id.startsWith("category-")) return `${baseUrl}/categories/${id}`;
  if (id.startsWith("store-")) return `${baseUrl}/stores/${id}`;
  if (id.startsWith("event-")) return `${baseUrl}/events/${id}`;
  return `${baseUrl}/${id}`;
}

// ─── Media filename generators ───────────────────────────────────────────────
//
// Naming patterns (all lowercase, hyphen-separated):
//   product image  → product-{name}-{category}-{store}-image-{n}.{ext}
//   product video  → product-{name}-{category}-{store}-video-{n}.{ext}
//   auction image  → auction-{name}-{category}-{store}-image-{n}.{ext}
//   preorder image → preorder-{name}-{category}-{store}-image-{n}.{ext}
//   store logo     → store-{name}-logo.{ext}
//   store banner   → store-{name}-banner.{ext}
//   blog image     → blog-{title}-{category}-image-{n}.{ext}
//   event image    → event-{title}-image-{n}.{ext}
//   category image → category-{name}-image.{ext}
//   user avatar    → user-{firstName}-{lastName}-avatar.{ext}
//   carousel image → carousel-{title}-image.{ext}
//   cropped image  → {original-basename}-cropped.{ext}
//   trimmed video  → {original-basename}-trimmed.{ext}
//   invoice        → invoice-{orderId}-{YYYYMMDD}.pdf
//   payout doc     → payout-doc-{sellerName}-{YYYYMMDD}.pdf

function basenameStem(filenameOrPath: string): string {
  const filename = filenameOrPath.split("/").pop() ?? filenameOrPath;
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
}

export interface GenerateProductImageFilenameInput {
  name: string;
  category: string;
  store: string;
  index?: number;
  ext?: string;
}
export function generateProductImageFilename(input: GenerateProductImageFilenameInput): string {
  const name = slugify(input.name).substring(0, 40).replace(/-+$/, "");
  const category = slugify(input.category).substring(0, 20).replace(/-+$/, "");
  const store = slugify(input.store).substring(0, 20).replace(/-+$/, "");
  const n = input.index ?? 1;
  const ext = (input.ext ?? "webp").replace(/^\./, "");
  return `product-${name}-${category}-${store}-image-${n}.${ext}`;
}

export interface GenerateProductVideoFilenameInput {
  name: string;
  category: string;
  store: string;
  index?: number;
  ext?: string;
}
export function generateProductVideoFilename(input: GenerateProductVideoFilenameInput): string {
  const name = slugify(input.name).substring(0, 40).replace(/-+$/, "");
  const category = slugify(input.category).substring(0, 20).replace(/-+$/, "");
  const store = slugify(input.store).substring(0, 20).replace(/-+$/, "");
  const n = input.index ?? 1;
  const ext = (input.ext ?? "mp4").replace(/^\./, "");
  return `product-${name}-${category}-${store}-video-${n}.${ext}`;
}

export interface GenerateAuctionImageFilenameInput {
  name: string;
  category: string;
  store: string;
  index?: number;
  ext?: string;
}
export function generateAuctionImageFilename(input: GenerateAuctionImageFilenameInput): string {
  const name = slugify(input.name).substring(0, 40).replace(/-+$/, "");
  const category = slugify(input.category).substring(0, 20).replace(/-+$/, "");
  const store = slugify(input.store).substring(0, 20).replace(/-+$/, "");
  const n = input.index ?? 1;
  const ext = (input.ext ?? "webp").replace(/^\./, "");
  return `auction-${name}-${category}-${store}-image-${n}.${ext}`;
}

export interface GeneratePreOrderImageFilenameInput {
  name: string;
  category: string;
  store: string;
  index?: number;
  ext?: string;
}
export function generatePreOrderImageFilename(input: GeneratePreOrderImageFilenameInput): string {
  const name = slugify(input.name).substring(0, 40).replace(/-+$/, "");
  const category = slugify(input.category).substring(0, 20).replace(/-+$/, "");
  const store = slugify(input.store).substring(0, 20).replace(/-+$/, "");
  const n = input.index ?? 1;
  const ext = (input.ext ?? "webp").replace(/^\./, "");
  return `preorder-${name}-${category}-${store}-image-${n}.${ext}`;
}

export interface GenerateReviewImageFilenameInput {
  productId: string;
  index?: number;
  ext?: string;
}
export function generateReviewImageFilename(input: GenerateReviewImageFilenameInput): string {
  const product = slugify(input.productId).substring(0, 40).replace(/-+$/, "");
  const n = input.index ?? 1;
  const ext = (input.ext ?? "webp").replace(/^\./, "");
  return `review-${product}-image-${n}.${ext}`;
}

export interface GenerateReviewVideoFilenameInput {
  productId: string;
  ext?: string;
}
export function generateReviewVideoFilename(input: GenerateReviewVideoFilenameInput): string {
  const product = slugify(input.productId).substring(0, 40).replace(/-+$/, "");
  const ext = (input.ext ?? "mp4").replace(/^\./, "");
  return `review-${product}-video-1.${ext}`;
}

export function generateStoreLogoFilename(storeName: string, ext: string = "webp"): string {
  const store = slugify(storeName).substring(0, 40).replace(/-+$/, "");
  return `store-${store}-logo.${ext.replace(/^\./, "")}`;
}

export function generateStoreBannerFilename(storeName: string, ext: string = "webp"): string {
  const store = slugify(storeName).substring(0, 40).replace(/-+$/, "");
  return `store-${store}-banner.${ext.replace(/^\./, "")}`;
}

export interface GenerateBlogImageFilenameInput {
  title: string;
  category: string;
  index?: number;
  ext?: string;
}
export function generateBlogImageFilename(input: GenerateBlogImageFilenameInput): string {
  const title = slugify(input.title).substring(0, 40).replace(/-+$/, "");
  const category = slugify(input.category).substring(0, 20).replace(/-+$/, "");
  const n = input.index ?? 1;
  const ext = (input.ext ?? "webp").replace(/^\./, "");
  return `blog-${title}-${category}-image-${n}.${ext}`;
}

export interface GenerateEventImageFilenameInput {
  title: string;
  index?: number;
  ext?: string;
}
export function generateEventImageFilename(input: GenerateEventImageFilenameInput): string {
  const title = slugify(input.title).substring(0, 50).replace(/-+$/, "");
  const n = input.index ?? 1;
  const ext = (input.ext ?? "webp").replace(/^\./, "");
  return `event-${title}-image-${n}.${ext}`;
}

export function generateCategoryImageFilename(categoryName: string, ext: string = "webp"): string {
  const name = slugify(categoryName).substring(0, 40).replace(/-+$/, "");
  return `category-${name}-image.${ext.replace(/^\./, "")}`;
}

export function generateUserAvatarFilename(firstName: string, lastName: string, ext: string = "webp"): string {
  const first = slugify(firstName).substring(0, 20).replace(/-+$/, "");
  const last = slugify(lastName).substring(0, 20).replace(/-+$/, "");
  return `user-${first}-${last}-avatar.${ext.replace(/^\./, "")}`;
}

export function generateCarouselImageFilename(title: string, ext: string = "webp"): string {
  const slug = slugify(title).substring(0, 40).replace(/-+$/, "");
  return `carousel-${slug}-image.${ext.replace(/^\./, "")}`;
}

export function generateCroppedImageFilename(originalFilenameOrPath: string, ext?: string): string {
  const stem = basenameStem(originalFilenameOrPath);
  const originalExt = originalFilenameOrPath.includes(".")
    ? originalFilenameOrPath.split(".").pop()!
    : "webp";
  return `${stem}-cropped.${(ext ?? originalExt).replace(/^\./, "")}`;
}

export function generateTrimmedVideoFilename(originalFilenameOrPath: string, ext?: string): string {
  const stem = basenameStem(originalFilenameOrPath);
  const originalExt = originalFilenameOrPath.includes(".")
    ? originalFilenameOrPath.split(".").pop()!
    : "mp4";
  return `${stem}-trimmed.${(ext ?? originalExt).replace(/^\./, "")}`;
}

export function generateInvoiceFilename(orderId: string, date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `invoice-${orderId}-${y}${m}${d}.pdf`;
}

export function generatePayoutDocFilename(sellerName: string, date: Date = new Date()): string {
  const seller = slugify(sellerName).substring(0, 30).replace(/-+$/, "");
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `payout-doc-${seller}-${y}${m}${d}.pdf`;
}

// ─── Unified media filename dispatcher ───────────────────────────────────────

export type MediaFilenameContext =
  | ({ type: "product-image" } & GenerateProductImageFilenameInput)
  | ({ type: "product-video" } & GenerateProductVideoFilenameInput)
  | ({ type: "review-image" } & GenerateReviewImageFilenameInput)
  | ({ type: "review-video" } & GenerateReviewVideoFilenameInput)
  | ({ type: "auction-image" } & GenerateAuctionImageFilenameInput)
  | ({ type: "preorder-image" } & GeneratePreOrderImageFilenameInput)
  | { type: "store-logo"; store: string; ext?: string }
  | { type: "store-banner"; store: string; ext?: string }
  | ({ type: "blog-image" } & GenerateBlogImageFilenameInput)
  | ({ type: "blog-cover" } & GenerateBlogImageFilenameInput)
  | ({ type: "blog-content-image" } & GenerateBlogImageFilenameInput)
  | ({ type: "blog-additional-image" } & GenerateBlogImageFilenameInput)
  | ({ type: "event-image" } & GenerateEventImageFilenameInput)
  | ({ type: "event-cover" } & GenerateEventImageFilenameInput)
  | ({ type: "event-winner-image" } & GenerateEventImageFilenameInput)
  | ({ type: "event-additional-image" } & GenerateEventImageFilenameInput)
  | { type: "category-image"; name: string; ext?: string }
  | { type: "user-avatar"; firstName: string; lastName: string; ext?: string }
  | { type: "carousel-image"; title: string; ext?: string }
  | { type: "invoice"; orderId: string; date?: Date }
  | { type: "payout-doc"; sellerName: string; date?: Date };

export function generateMediaFilename(ctx: MediaFilenameContext): string {
  switch (ctx.type) {
    case "product-image":   return generateProductImageFilename(ctx);
    case "product-video":   return generateProductVideoFilename(ctx);
    case "review-image":    return generateReviewImageFilename(ctx);
    case "review-video":    return generateReviewVideoFilename(ctx);
    case "auction-image":   return generateAuctionImageFilename(ctx);
    case "preorder-image":  return generatePreOrderImageFilename(ctx);
    case "store-logo":      return generateStoreLogoFilename(ctx.store, ctx.ext);
    case "store-banner":    return generateStoreBannerFilename(ctx.store, ctx.ext);
    case "blog-image":      return generateBlogImageFilename(ctx);
    case "blog-cover":      return generateBlogImageFilename(ctx);
    case "blog-content-image": return generateBlogImageFilename(ctx);
    case "blog-additional-image": return generateBlogImageFilename(ctx);
    case "event-image":     return generateEventImageFilename(ctx);
    case "event-cover":     return generateEventImageFilename(ctx);
    case "event-winner-image": return generateEventImageFilename(ctx);
    case "event-additional-image": return generateEventImageFilename(ctx);
    case "category-image":  return generateCategoryImageFilename(ctx.name, ctx.ext);
    case "user-avatar":     return generateUserAvatarFilename(ctx.firstName, ctx.lastName, ctx.ext);
    case "carousel-image":  return generateCarouselImageFilename(ctx.title, ctx.ext);
    case "invoice":         return generateInvoiceFilename(ctx.orderId, ctx.date);
    case "payout-doc":      return generatePayoutDocFilename(ctx.sellerName, ctx.date);
  }
}
