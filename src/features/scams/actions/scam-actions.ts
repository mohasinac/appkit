"use server";

import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { scammerRepository } from "../repository/scammer.repository";
import type {
  ScammerDocument,
  ScammerIncidentDocument,
  ScammerCommentDocument,
} from "../schemas/firestore";

export interface ScammerProfilePageData {
  scammer: ScammerDocument;
  incidents: ScammerIncidentDocument[];
  comments: ScammerCommentDocument[];
  relatedScammers: ScammerDocument[];
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
  scammerRepository.incrementViews(doc.id).catch(() => {}); // audit-silent-catch-ok: view-count is best-effort analytics

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

  const [incidents, comments, relatedScammers] = await Promise.all([
    scammerRepository.listPublicIncidents(scammer.id),
    scammerRepository.listPublicComments(scammer.id),
    scammerRepository.findManyById(scammer.relatedScammerIds),
  ]);

  return { scammer, incidents, comments, relatedScammers };
}
