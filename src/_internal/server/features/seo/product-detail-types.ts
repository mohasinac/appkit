/**
 * Which listing types actually RENDER at `/products/{slug}`.
 *
 * DERIVED from each plugin's own `detailRoute`, never hand-written. Two SEO
 * surfaces need this set — the sitemap (what to submit) and
 * `generateStaticParams` (what to prerender) — and a third, the page itself,
 * enforces it by `permanentRedirect`ing a non-standard type away.
 *
 * 🛑 It used to be a literal `["standard", "art", "stickers"]` in `sitemap.ts`.
 * When `spares` was added as a tenth listing type pointing at the same route,
 * that literal was not updated, so the product became renderable at
 * `/products/{slug}` and was never submitted — measured 2026-10-24, 14 product
 * URLs in the sitemap against 15 that resolve. That is Root Cause #61's shape
 * (N hand-written enumerations of one union, only the compile-checked ones
 * staying correct), and deriving is the documented fix.
 *
 * Comparing rendered routes rather than naming types keeps it honest: a
 * plugin that is repointed at its own page leaves this set automatically.
 */
import { ALL_LISTING_TYPES } from "../../../shared/listing-types/feature-flags";
import { pluginFor } from "../../../shared/listing-types/_registry";
import { ROUTES } from "../../../../next/routing/route-map";

/** An arbitrary probe slug — only the SHAPE of the resolved route matters. */
const PROBE = "__route_probe__";
const PRODUCT_DETAIL_ROUTE = String(ROUTES.PUBLIC.PRODUCT_DETAIL(PROBE));

export const PRODUCT_DETAIL_LISTING_TYPES: readonly string[] = ALL_LISTING_TYPES.filter(
  (type) => pluginFor(type).detailRoute(PROBE) === PRODUCT_DETAIL_ROUTE,
);
