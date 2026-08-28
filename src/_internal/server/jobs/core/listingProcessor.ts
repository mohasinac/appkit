/**
 * Core: server-to-server listing proxy. Every appkit repository routes its
 * `.list()` through the same Sieve adapter, so adding a new collection is a
 * one-line addition to `LISTERS`.
 *
 * Cursor: opaque base64 over `{ page }`. Callers may use either page-mode
 * (`p` directly) or infinite-mode (forward `cursor` from previous response).
 */

import {
  bidRepository,
  blogRepository,
  categoriesRepository,
  couponsRepository,
  eventEntryRepository,
  eventRepository,
  faqsRepository,
  homepageSectionsRepository,
  notificationRepository,
  orderRepository,
  payoutRepository,
  productFeaturesRepository,
  productRepository,
  productTemplateRepository,
  reviewRepository,
  scammerRepository,
  storeRepository,
  userRepository,
} from "../../../../repositories";
import type { JobContext } from "../runtime/types";
import type { JsonValue } from "../../../../schemas/types";
import { normalizeError } from "../../../../errors/normalize";

const DEFAULT_SORT = "-createdAt";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface ListingRequestBody {
  collection: string;
  // NOTE: there is deliberately no top-level `q`. One used to be declared here
  // and `runListingProcessor` never read it, so the interface advertised a
  // search capability the implementation did not have. Free-text search travels
  // as `baseOpts.search` — Sieve cannot express array-contains, so it can never
  // ride in `f`.
  f?: string;
  s?: string;
  p?: number | string;
  ps?: number | string;
  cursor?: string;
  baseOpts?: Record<string, JsonValue>;
}

export interface ListingResponseBody {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  cursor: string | null;
}

interface SieveLikeResult {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

type Lister = (
  model: { filters: string; sorts: string; page: string; pageSize: string },
  baseOpts: Record<string, JsonValue>,
) => Promise<SieveLikeResult>;

class ListingError extends Error {
  httpStatus: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ListingError";
    this.httpStatus = status;
  }
}

function requireOpt(baseOpts: Record<string, JsonValue>, key: string, collection: string): string {
  const value = baseOpts[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new ListingError(400, `${collection} listing requires baseOpts.${key}`);
  }
  return value;
}

function getBoolOpt(baseOpts: Record<string, JsonValue>, key: string, fallback: boolean): boolean {
  const value = baseOpts[key];
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function getStringOpt(
  baseOpts: Record<string, JsonValue>,
  key: string,
): string | undefined {
  const value = baseOpts[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getStringArrayOpt(
  baseOpts: Record<string, JsonValue>,
  key: string,
): string[] | undefined {
  const value = baseOpts[key];
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((v): v is string => typeof v === "string" && v.length > 0);
  return strings.length > 0 ? strings : undefined;
}

const LISTERS: Record<string, Lister> = {
  products: (m, o) =>
    productRepository.list(m, o as Parameters<typeof productRepository.list>[1]),
  categories: (m) => categoriesRepository.list(m),
  brands: (m) =>
    categoriesRepository.list({
      ...m,
      filters: m.filters
        ? `${m.filters},categoryType==brand`
        : "categoryType==brand",
    }),
  orders: (m, o) => orderRepository.listAll(m, { search: getStringOpt(o, "search") }),
  reviews: (m, o) => reviewRepository.listAll(m, { search: getStringOpt(o, "search") }),
  coupons: (m) => couponsRepository.list(m),
  bids: (m) => bidRepository.list(m),
  payouts: (m) => payoutRepository.list(m),
  blogPosts: (m, o) => blogRepository.listAll(m, { search: getStringOpt(o, "search") }),
  events: (m, o) => eventRepository.list(m, { search: getStringOpt(o, "search") }),
  // 🛑 EVERY lister whose repository accepts a `search` opt MUST forward it.
  // `baseOpts.search` is how token search reaches the repository — Sieve cannot
  // express array-contains, so it can never ride inside `filters`. A lister
  // written `(m) => repo.list(m)` silently drops it and the Function returns an
  // UNFILTERED page with a 200, while the same route's local fallback filters
  // correctly — so it only reproduces in production, and only when the Function
  // is reachable. That is how it survived here for orders, reviews, blogPosts,
  // events and stores after their routes and repositories were both wired.
  // Forwards opts so `baseOpts.search` reaches the repository's token search.
  // This was `(m) => faqsRepository.list(m)` — the second argument was dropped,
  // which made FAQ token search structurally unreachable through the Function
  // even though the repository has implemented it all along.
  faqs: (m, o) =>
    faqsRepository.list(m, {
      search: getStringOpt(o, "search"),
      tags: getStringArrayOpt(o, "tags"),
    }),
  notifications: (m) => notificationRepository.list(m),
  scammers: (m) => scammerRepository.listAll(m),
  sublistingCategories: (m) =>
    categoriesRepository.list({
      ...m,
      filters: m.filters
        ? `${m.filters},categoryType==sublisting`
        : "categoryType==sublisting",
    }),
  productFeatures: (m) => productFeaturesRepository.list(m),
  homepageSections: (m) => homepageSectionsRepository.list(m),
  users: (m) => userRepository.list(m),
  stores: (m, o) =>
    storeRepository.listStores(m, getBoolOpt(o, "activeOnly", true), {
      search: getStringOpt(o, "search"),
    }),
  eventEntries: (m, o) => {
    const eventId = requireOpt(o, "eventId", "eventEntries");
    return eventEntryRepository.listForEvent(eventId, m);
  },
  productTemplates: (m, o) => {
    const storeId = requireOpt(o, "storeId", "productTemplates");
    return productTemplateRepository.listByStore(storeId, m);
  },
};

const SUPPORTED_COLLECTIONS = Object.keys(LISTERS);

function decodeCursor(cursor: string | undefined | null): number | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, "base64").toString("utf8");
    const parsed = JSON.parse(json) as { page?: number };
    const page = Number(parsed.page);
    return Number.isFinite(page) && page > 0 ? page : null;
  } catch (_err) {
    void normalizeError(_err); // Malformed base64 or JSON — treat as no cursor
    return null;
  }
}

function encodeCursor(page: number): string {
  return Buffer.from(JSON.stringify({ page }), "utf8").toString("base64");
}

function clampPageSize(raw: number | string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}

function clampPage(raw: number | string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE;
  return Math.floor(n);
}

export async function runListingProcessor(
  body: ListingRequestBody,
  ctx: JobContext,
): Promise<ListingResponseBody> {
  if (!body || typeof body.collection !== "string") {
    throw new ListingError(400, "Missing collection");
  }
  const lister = LISTERS[body.collection];
  if (!lister) {
    throw new ListingError(
      400,
      `Unsupported collection: ${body.collection}. Supported: ${SUPPORTED_COLLECTIONS.join(",")}`,
    );
  }

  const cursorPage = decodeCursor(body.cursor);
  const page = cursorPage ?? clampPage(body.p);
  const pageSize = clampPageSize(body.ps);

  const result = await lister(
    {
      filters: body.f ?? "",
      sorts: body.s ?? DEFAULT_SORT,
      page: String(page),
      pageSize: String(pageSize),
    },
    body.baseOpts ?? {},
  );

  ctx.logger.info("listing served", {
    collection: body.collection,
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
  });

  return {
    items: result.items,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    hasMore: result.hasMore,
    cursor: result.hasMore ? encodeCursor(result.page + 1) : null,
  };
}

export const supportedListingCollections = SUPPORTED_COLLECTIONS;
