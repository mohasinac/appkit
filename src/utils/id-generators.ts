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
