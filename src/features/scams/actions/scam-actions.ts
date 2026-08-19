"use server";

import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { scammerRepository } from "../repository/scammer.repository";
import { userRepository } from "../../auth/repository/user.repository";
import { storeRepository } from "../../stores/repository/store.repository";
import { safeFireAndForget } from "../../../utils/safe-fire-forget";
import type {
  ScammerDocument,
  ScammerIncidentDocument,
  ScammerCommentDocument,
} from "../schemas/firestore";

export interface ScammerProfilePageData {
  scammer: ScammerDocument;
  incidents: ScammerIncidentDocument[];
  comments: ScammerCommentDocument[];
  /** Admin-curated cross-links — confirmed to be the same person under a different alias. */
  relatedScammers: ScammerDocument[];
  /** Other verified profiles with the same scamType — pattern similarity only, never identity. */
  similarScamReports: ScammerDocument[];
}

export interface ScammerListResult {
  items: ScammerDocument[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * List verified scammer profiles for the public registry page.
 * Accepts sieve-style searchParams from Next.js page props.
 */
export async function listVerifiedScammers(
  searchParams?: Record<string, string | string[]>,
): Promise<ScammerListResult> {
  const params = searchParams ?? {};
  const page     = Math.max(1, Number(params.p ?? params.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(params.ps ?? params.pageSize ?? 20)));
  const sort     = String(params.s ?? params.sort ?? "-createdAt");

  // scamType / scamPlatform filter chips — status==verified is enforced by the base query
  const filters: string[] = [];
  if (params.scamType)     filters.push(sieveFilter("scamType", SIEVE_OP.EQ, String(params.scamType)));
  if (params.scamPlatform) filters.push(sieveFilter("scamPlatform", SIEVE_OP.EQ, String(params.scamPlatform)));

  const result = await scammerRepository.listVerified({
    filters: filters.join(",") || undefined,
    sorts: sort,
    page,
    pageSize,
  });

  return {
    items:    result.items,
    total:    result.total,
    page,
    pageSize,
    hasMore:  result.hasMore,
  };
}

/**
 * Fetch a single verified scammer by id or seoSlug.
 * Also increments the view counter (fire-and-forget).
 */
export async function getPublicScammerById(id: string): Promise<ScammerDocument | null> {
  // Try direct id lookup first; fall back to seoSlug query.
  let doc = await scammerRepository.findById(id).catch(() => null);
  if (!doc) {
    doc = await scammerRepository.findBySeoSlug(id).catch(() => null);
  }
  if (!doc || doc.status !== "verified") return null;

  // Increment views — non-blocking.
  safeFireAndForget(scammerRepository.incrementViews(doc.id), "scam: incrementViews");

  return doc;
}

/**
 * Fetch full profile page data: main doc + verified incidents + public comments + related scammers.
 * Returns null if not found or not verified.
 */
export async function getScammerProfilePageData(
  id: string,
): Promise<ScammerProfilePageData | null> {
  const scammer = await getPublicScammerById(id);
  if (!scammer) return null;

  const [incidents, comments, relatedScammers, similarScamReports] = await Promise.all([
    scammerRepository.listPublicIncidents(scammer.id),
    scammerRepository.listPublicComments(scammer.id),
    scammerRepository.findManyById(scammer.relatedScammerIds),
    scammerRepository.findBySameType(scammer.scamType, scammer.id),
  ]);

  return { scammer, incidents, comments, relatedScammers, similarScamReports };
}

export type SellerTrustStatus = "clear" | "flagged";

export interface SellerTrustResult {
  status: SellerTrustStatus;
  /** seoSlug of matched verified scammer profiles — links to /scams/[slug]. Empty when clear. */
  matchedProfileSlugs: string[];
}

const TRUST_STATUS_CLEAR: SellerTrustResult = { status: "clear", matchedProfileSlugs: [] };

/**
 * P-12 — resolves a store owner's phone/email against the verified (admin-published)
 * scammer registry only. Never surfaces "under review" reports to buyers — a report
 * that hasn't been verified must not damage a seller's storefront reputation.
 */
export async function getSellerTrustStatus(storeId: string): Promise<SellerTrustResult> {
  const store = await storeRepository.findById(storeId).catch(() => null);
  if (!store?.ownerId) return TRUST_STATUS_CLEAR;

  const owner = await userRepository.findById(store.ownerId).catch(() => null);
  if (!owner) return TRUST_STATUS_CLEAR;

  const lookups: Array<Promise<ScammerDocument[]>> = [];
  if (owner.phoneNumber) lookups.push(scammerRepository.findByContactField("phones", owner.phoneNumber));
  if (owner.email) lookups.push(scammerRepository.findByContactField("emails", owner.email));
  if (lookups.length === 0) return TRUST_STATUS_CLEAR;

  const results = await Promise.all(lookups.map((p) => p.catch(() => [] as ScammerDocument[])));
  const verified = results.flat().filter((s) => s.status === "verified");
  if (verified.length === 0) return TRUST_STATUS_CLEAR;

  return {
    status: "flagged",
    matchedProfileSlugs: [...new Set(verified.map((s) => s.seoSlug))],
  };
}
