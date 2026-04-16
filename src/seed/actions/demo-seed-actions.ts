/**
 * Demo Seed Domain Actions — appkit
 *
 * Dev-only actions for loading/deleting seed data.
 * Delegates to the consumer's POST /api/demo/seed route which contains
 * the actual collection-specific seeding logic (800+ lines with PII encryption,
 * Auth user creation, subcollection handling, etc.).
 */

import { ValidationError } from "../../errors/index";
import { serverLogger } from "../../monitoring/index";

export type SeedCollectionName =
  | "users"
  | "addresses"
  | "categories"
  | "stores"
  | "products"
  | "orders"
  | "reviews"
  | "bids"
  | "coupons"
  | "carouselSlides"
  | "homepageSections"
  | "siteSettings"
  | "faqs"
  | "notifications"
  | "payouts"
  | "blogPosts"
  | "events"
  | "eventEntries"
  | "sessions"
  | "carts";

export interface SeedOperationResult {
  message: string;
  details: {
    created?: number;
    updated?: number;
    deleted?: number;
    skipped?: number;
    errors?: number;
    collections?: string[];
  };
}

/**
 * Execute seed operation by calling the consumer's API route.
 *
 * @param vars action ("load" | "delete") and optional collection list
 * @param apiBaseUrl base URL for the seed API route (e.g., "http://localhost:3000" or production URL)
 * @returns operation result with counts and collection names
 */
export async function demoSeed(
  vars: {
    action: "load" | "delete";
    collections?: SeedCollectionName[];
  },
  apiBaseUrl: string,
): Promise<SeedOperationResult> {
  const response = await fetch(`${apiBaseUrl}/api/demo/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vars),
  });

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ message: "Seed operation failed" }));
    serverLogger.error("demoSeed failed", {
      status: response.status,
      body: errorBody,
    });
    throw new ValidationError(errorBody.message ?? "Seed operation failed");
  }

  const result = await response.json();
  return result.data as SeedOperationResult;
}
