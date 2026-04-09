/**
 * SEO-Friendly ID Generators
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

export interface GenerateCategoryIdInput {
  name: string;
  parentName?: string;
  rootName?: string;
}
export function generateCategoryId(input: GenerateCategoryIdInput): string {
  const nameSlug = slugify(input.name);
  if (input.parentName)
    return `category-${nameSlug}-${slugify(input.parentName)}`;
  if (input.rootName) return `category-${nameSlug}-${slugify(input.rootName)}`;
  return `category-${nameSlug}`;
}

export interface GenerateUserIdInput {
  firstName: string;
  lastName: string;
  email: string;
}
export function generateUserId(input: GenerateUserIdInput): string {
  const firstSlug = slugify(input.firstName);
  const lastSlug = slugify(input.lastName);
  const emailPrefix = input.email.split("@")[0].toLowerCase().substring(0, 8);
  const emailSlug = slugify(emailPrefix);
  return `user-${firstSlug}-${lastSlug}-${emailSlug}`;
}

export interface GenerateProductIdInput {
  name: string;
  category: string;
  condition: "new" | "used" | "refurbished";
  sellerName: string;
  count?: number;
}
export function generateProductId(input: GenerateProductIdInput): string {
  const count = input.count || 1;
  return `product-${slugify(input.name)}-${slugify(input.category)}-${input.condition}-${slugify(input.sellerName)}-${count}`;
}

export interface GenerateAuctionIdInput {
  name: string;
  category: string;
  condition: "new" | "used" | "refurbished";
  sellerName: string;
  count?: number;
}
export function generateAuctionId(input: GenerateAuctionIdInput): string {
  const count = input.count || 1;
  return `auction-${slugify(input.name)}-${slugify(input.category)}-${input.condition}-${slugify(input.sellerName)}-${count}`;
}

export interface GeneratePreOrderIdInput {
  name: string;
  category: string;
  condition: "new" | "used" | "refurbished";
  sellerName: string;
  count?: number;
}
export function generatePreOrderId(input: GeneratePreOrderIdInput): string {
  const count = input.count || 1;
  return `preorder-${slugify(input.name)}-${slugify(input.category)}-${input.condition}-${slugify(input.sellerName)}-${count}`;
}

export interface GenerateReviewIdInput {
  productName: string;
  userFirstName: string;
  date?: Date;
}
export function generateReviewId(input: GenerateReviewIdInput): string {
  const date = input.date || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `review-${slugify(input.productName)}-${slugify(input.userFirstName)}-${y}${m}${d}`;
}

export interface GenerateOrderIdInput {
  productCount: number;
  date?: Date;
}
export function generateOrderId(input: GenerateOrderIdInput): string {
  const date = input.date || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `order-${input.productCount}-${y}${m}${d}-${generateRandomString(6)}`;
}

export interface GenerateFAQIdInput {
  category: string;
  question: string;
}
export function generateFAQId(input: GenerateFAQIdInput): string {
  return `faq-${slugify(input.category)}-${slugify(input.question).substring(0, 50)}`;
}

export function generateCouponId(code: string): string {
  return `coupon-${code.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
}

export interface GenerateCarouselIdInput {
  title: string;
}
export function generateCarouselId(input: GenerateCarouselIdInput): string {
  return `carousel-${slugify(input.title).substring(0, 30)}-${getTimestamp()}`;
}

export interface GenerateHomepageSectionIdInput {
  type: string;
}
export function generateHomepageSectionId(
  input: GenerateHomepageSectionIdInput,
): string {
  return `section-${slugify(input.type)}-${getTimestamp()}`;
}

export interface GenerateBidIdInput {
  productName: string;
  userFirstName: string;
  date?: Date;
  random?: string;
}
export function generateBidId(input: GenerateBidIdInput): string {
  const date = input.date || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const random = input.random || generateRandomString(6);
  return `bid-${slugify(input.productName).substring(0, 30)}-${slugify(input.userFirstName)}-${y}${m}${d}-${random}`;
}

export interface GenerateBlogPostIdInput {
  title: string;
  category: string;
  status?: "draft" | "published" | "archived";
}
export function generateBlogPostId(input: GenerateBlogPostIdInput): string {
  const titleSlug = slugify(input.title).substring(0, 40).replace(/-+$/, "");
  const categorySlug = slugify(input.category);
  const base = `blog-${titleSlug}-${categorySlug}`;
  if (input.status && input.status !== "published")
    return `${base}-${input.status}`;
  return base;
}

export interface GeneratePayoutIdInput {
  sellerName: string;
  date?: Date;
}
export function generatePayoutId(input: GeneratePayoutIdInput): string {
  const sellerSlug = slugify(input.sellerName)
    .substring(0, 25)
    .replace(/-+$/, "");
  const date = input.date || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `payout-${sellerSlug}-${y}${m}${d}-${generateRandomString(6)}`;
}
