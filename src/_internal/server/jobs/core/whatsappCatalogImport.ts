/**
 * Core: async WhatsApp Business Catalog import (`whatsappCatalogImport` job).
 *
 * `POST /api/store/whatsapp-settings/catalog-import` used to do this inline:
 * one Meta fetch capped at `limit=250`, then a sequential per-item loop doing
 * up to 2 `findBySlug` reads plus 1 `create` write EACH — a real 10s-timeout
 * risk on Vercel Hobby (CLAUDE.md Rule #6) well before the cap was reached.
 * It also declared `paging.next` in its response type and never followed it,
 * so a catalog larger than 250 items silently imported only the first page.
 *
 * Running here instead buys the Function's 300s budget, which is what makes
 * following `paging.next` safe rather than making the timeout worse.
 *
 * Two efficiency changes vs. the old route:
 *  - Existing-slug detection is ONE `findByStore` read into a Set, not 2 reads
 *    per item. A seller's WA catalog is populated by pushing their own store's
 *    products, so store-scoped lookup is equivalent to the old global
 *    `findBySlug` here while costing a single query.
 *  - That Set is updated as we create, so duplicate rows within one Meta
 *    response can't produce two products.
 */

import { normalizeError } from "../../../../errors/normalize";
import { storeRepository, productRepository } from "../../../../repositories";
import { decryptPii } from "../../../../security/index";
import type { ProductCreateInput } from "../../../../features/products/schemas/firestore";
import type { JobContext } from "../runtime/types";
import type { JobRunResult } from "./jobRunners";

const META_GRAPH_BASE = "https://graph.facebook.com/v20.0";
const SLUG_PREFIX = "product-";
const PAGE_SIZE = 250;

/**
 * Defensive stop. 40 pages x 250 = 10,000 items, far beyond any realistic
 * seller catalog — this exists so a malformed/looping `paging.next` from Meta
 * can't spin until the Function's 300s ceiling kills the job mid-write.
 */
const MAX_PAGES = 40;

interface MetaCatalogItem {
  id: string;
  name?: string;
  price?: string;
  currency?: string;
  image_url?: string;
  description?: string;
  retailer_id?: string;
}

interface MetaCatalogResponse {
  data?: MetaCatalogItem[];
  paging?: { next?: string };
  error?: { message: string };
}

export interface WhatsAppCatalogImportPayload {
  storeSlug: string;
}

/** Meta returns "<amount> <currency>", e.g. "450.00 INR". */
function parseMetaPrice(raw: string | undefined): number {
  if (!raw) return 0;
  const digits = raw.replace(/[^0-9.]/g, "");
  return Math.round((parseFloat(digits) || 0) * 100) / 100;
}

/**
 * The LetItRip slug a Meta item claims to correspond to, if any. Items we
 * pushed carry it in `description` (see catalog-sync's field mapping) and/or
 * `retailer_id`; items authored natively in Meta carry neither.
 */
function claimedSlug(item: MetaCatalogItem): string | null {
  const description = (item.description ?? "").trim();
  if (description.startsWith(SLUG_PREFIX)) return description;
  const retailerId = (item.retailer_id ?? "").trim();
  if (retailerId.startsWith(SLUG_PREFIX)) return retailerId;
  return null;
}

export async function runWhatsAppCatalogImport(
  payload: WhatsAppCatalogImportPayload,
  ctx: JobContext,
): Promise<JobRunResult> {
  const { storeSlug } = payload;
  const empty = { total: 0, succeeded: 0, skipped: 0, failed: 0 };

  const store = await storeRepository.findBySlug(storeSlug);
  if (!store) {
    return {
      summary: empty,
      succeeded: [],
      skipped: [],
      failed: [{ id: storeSlug, reason: "Store not found" }],
    };
  }

  const cfg = store.whatsappConfig;
  const token = cfg?.accessToken ? (decryptPii(cfg.accessToken) as string | null) : null;
  // Re-checked here even though the route gates on the same conditions — the
  // job doc outlives the request, and the seller could disconnect in between.
  if (!cfg?.connected || !cfg.catalogId || !token) {
    return {
      summary: empty,
      succeeded: [],
      skipped: [],
      failed: [{ id: storeSlug, reason: "WhatsApp is not connected for this store" }],
    };
  }

  const existing = await productRepository.findByStore(store.storeSlug);
  const knownSlugs = new Set(
    existing.map((p) => p.slug).filter((s): s is string => Boolean(s)),
  );

  const imported: string[] = [];
  const skipped: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  let url: string | undefined =
    `${META_GRAPH_BASE}/${cfg.catalogId}/products` +
    `?fields=name,price,currency,image_url,description,retailer_id&limit=${PAGE_SIZE}`;
  let page = 0;
  let truncated = false;

  while (url) {
    if (page >= MAX_PAGES) {
      truncated = true;
      ctx.logger.warn("whatsappCatalogImport: page cap reached — catalog truncated", {
        storeSlug,
        maxPages: MAX_PAGES,
        importedSoFar: imported.length,
      });
      break;
    }
    page++;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message: string } };
      const reason = body.error?.message ?? res.statusText;
      ctx.logger.error("whatsappCatalogImport: Meta fetch failed", null, { storeSlug, page, reason });
      failed.push({ id: `page-${page}`, reason: `Meta fetch failed: ${reason}` });
      break;
    }

    const body = (await res.json()) as MetaCatalogResponse;
    const items = body.data ?? [];

    for (const item of items) {
      const slug = claimedSlug(item);
      if (slug && knownSlugs.has(slug)) {
        skipped.push(item.id);
        continue;
      }

      const input: ProductCreateInput = {
        title: item.name ?? `WhatsApp Import ${item.id}`,
        description: "",
        slug: "",
        listingType: "standard",
        status: "draft",
        price: parseMetaPrice(item.price),
        currency: "INR",
        mainImage: item.image_url ?? "",
        images: [],
        stockQuantity: 1,
        condition: "new",
        storeId: store.id,
        storeName: store.storeName,
        tags: ["whatsapp-import"],
        categorySlugs: [],
        featured: false,
      };

      try {
        const created = await productRepository.create(input);
        // Guard against the same item appearing twice in one Meta response.
        if (slug) knownSlugs.add(slug);
        if (created.slug) knownSlugs.add(created.slug);
        imported.push(created.id);
      } catch (err) {
        void normalizeError(err);
        failed.push({
          id: item.id,
          reason: err instanceof Error ? err.message : "Product create failed",
        });
      }
    }

    url = body.paging?.next;
  }

  ctx.logger.info("whatsappCatalogImport: complete", {
    storeSlug,
    pages: page,
    imported: imported.length,
    skipped: skipped.length,
    failed: failed.length,
    truncated,
  });

  return {
    summary: {
      total: imported.length + skipped.length + failed.length,
      succeeded: imported.length,
      skipped: skipped.length,
      failed: failed.length,
    },
    succeeded: imported,
    skipped,
    failed,
    data: { imported: imported.length, skipped: skipped.length, pages: page, truncated },
  };
}
