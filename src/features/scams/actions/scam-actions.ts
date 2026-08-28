"use server";

import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { scammerRepository } from "../repository/scammer.repository";
import { safeRead } from "../../../errors/safe-read";
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
  // The profile IS the caller's subject, and both lookups already return null
  // for "no such id/slug" — swallowing a read failure into that same null would
  // report a real outage as a missing profile.
  let doc = await scammerRepository.findById(id);
  if (!doc) {
    doc = await scammerRepository.findBySeoSlug(id);
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

/**
 * `unknown` exists because `clear` is a POSITIVE SAFETY CLAIM — it renders as
 * "✓ Verified Safe" next to a seller's name. Every read in
 * `getSellerTrustStatus` used to fail open to `clear`, so a scam-registry
 * outage actively endorsed a seller nobody had checked. Failing open is still
 * right (an outage must not brand a legitimate seller a scammer), but the
 * honest failure state is "we could not check", not "we checked and it's fine".
 */
export type SellerTrustStatus = "clear" | "flagged" | "unknown";

export interface SellerTrustResult {
  status: SellerTrustStatus;
  /** seoSlug of matched verified scammer profiles — links to /scams/[slug]. Empty when clear. */
  matchedProfileSlugs: string[];
}

const TRUST_STATUS_CLEAR: SellerTrustResult = { status: "clear", matchedProfileSlugs: [] };
const TRUST_STATUS_UNKNOWN: SellerTrustResult = { status: "unknown", matchedProfileSlugs: [] };

/**
 * Wrap a read so a FAILURE is distinguishable from a legitimate empty result.
 *
 * `safeRead` alone cannot express this: its fallback has the same type as a
 * successful read, so `null` from a failed store lookup and `null` from a store
 * that does not exist are the same value. Tagging the outcome is what lets the
 * caller answer "unknown" instead of "clear".
 */
async function readTagged<T>(
  fn: () => Promise<T>,
  key: string,
): Promise<{ ok: true; value: T } | { ok: false; value: null }> {
  type Tagged = { ok: true; value: T } | { ok: false; value: null };
  return safeRead<Tagged>(async () => ({ ok: true as const, value: await fn() }), {
    route: "sellerTrust",
    key,
    fallback: { ok: false as const, value: null },
  });
}

/**
 * P-12 — resolves a store owner's phone/email against the verified (admin-published)
 * scammer registry only. Never surfaces "under review" reports to buyers — a report
 * that hasn't been verified must not damage a seller's storefront reputation.
 */
export async function getSellerTrustStatus(storeId: string): Promise<SellerTrustResult> {
  // Every read below fails OPEN to "clear" — a deliberate choice, because a
  // registry outage must not brand a legitimate seller a scammer. But "clear"
  // is a positive safety claim, so a failure that produces one has to be
  // recorded rather than inferred from a silent null.
  const store = await readTagged(
    () => storeRepository.findById(storeId),
    "sellerTrust.store",
  );
  if (!store.ok) return TRUST_STATUS_UNKNOWN;
  if (!store.value?.ownerId) return TRUST_STATUS_CLEAR;

  const ownerId = store.value.ownerId;
  const owner = await readTagged(
    () => userRepository.findById(ownerId),
    "sellerTrust.owner",
  );
  if (!owner.ok) return TRUST_STATUS_UNKNOWN;
  if (!owner.value) return TRUST_STATUS_CLEAR;

  const ownerDoc = owner.value;
  const lookups: Array<() => Promise<ScammerDocument[]>> = [];
  if (ownerDoc.phoneNumber) {
    const phone = ownerDoc.phoneNumber;
    lookups.push(() => scammerRepository.findByContactField("phones", phone));
  }
  if (ownerDoc.email) {
    const email = ownerDoc.email;
    lookups.push(() => scammerRepository.findByContactField("emails", email));
  }
  if (lookups.length === 0) return TRUST_STATUS_CLEAR;

  const results = await Promise.all(
    lookups.map((fn) => readTagged(fn, "sellerTrust.registryLookup")),
  );
  // A partial answer is not an answer: if ANY registry lookup failed we cannot
  // say the seller is clear, only that we could not check.
  if (results.some((r) => !r.ok)) return TRUST_STATUS_UNKNOWN;
  const verified = results
    .flatMap((r) => r.value ?? [])
    .filter((s) => s.status === "verified");
  if (verified.length === 0) return TRUST_STATUS_CLEAR;

  return {
    status: "flagged",
    matchedProfileSlugs: [...new Set(verified.map((s) => s.seoSlug))],
  };
}
