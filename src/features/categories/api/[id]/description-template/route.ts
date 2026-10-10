/**
 * feat-categories — GET /api/categories/[id]/description-template
 *
 * The ONE read the seller form makes when a category or condition changes.
 *
 * ```ts
 * // app/api/categories/[id]/description-template/route.ts
 * export { categoryDescriptionTemplateGET as GET } from "@mohasinac/appkit";
 * ```
 *
 * ## Why an endpoint rather than letting the client walk the tree
 *
 * A description template lives on the category and INHERITS: a named-model
 * leaf like `category-dragoon-g` carries no body of its own, and the right one
 * is on the `category-original-engine-gear` line above it. Resolving that on
 * the client would be one request per ancestor, on every category change, from
 * a form — up to five round trips to answer one question.
 *
 * Here it is **two reads worst case and zero on a cache hit**: the leaf, then
 * one bounded `getAll` over at most four ancestors, behind a one-hour edge
 * cache. The response depends only on `(id, variant)` and category content
 * changes when an admin edits it, so an hour of staleness costs a seller
 * nothing and saves a function invocation per keystroke-free form open.
 *
 * ## 🛑 NO MONEY IN THIS PAYLOAD
 *
 * `Cache-Control: public` means a CDN holds this and anyone can fetch it, so
 * `priceGuidance` is deliberately stripped even though it sits in the same
 * `productDefaults` object. The band is competitor-derived market data, not a
 * listing price — but prices are withheld from signed-out visitors precisely
 * because hiding one number is pointless if a neighbouring surface publishes
 * the range, and a publicly-cached endpoint is exactly such a surface. The
 * seller's price hint is C1's job, from a surface that knows who is asking.
 *
 * `taxCodeId` is stripped for a different reason: nothing on the client reads
 * it. The rate is resolved server-side by `deriveTaxonomy`, which is the whole
 * point of the reference being server-resolved (C2a) — a client that knew the
 * code could not do anything correct with it.
 */

import { NextResponse } from "next/server.js";
import { normalizeError } from "../../../../../errors/normalize";
import { serverLogger } from "../../../../../monitoring";
/*
 * The repository directly, which is the established shape for an appkit API
 * route (blog/[slug], products/[id] and seller/products all do the same). The
 * `getProviders()` contract exposes only the generic `IRepository`, so the
 * bounded `findByIds` ancestor walk this route needs is not reachable through
 * it — and the alternative is four sequential reads on a route the seller form
 * hits on every category change.
 */
import { categoriesRepository } from "../../../repository/categories.repository";
import type {
  CategoryDescriptionTemplate,
  CategoryProductDefaults,
  CategorySpecification,
  CategoryTemplateVariant,
} from "../../../schemas/category-content";
import { usedPlaceholders } from "../../../../../_internal/shared/templating/placeholders";

/**
 * The variants a caller may ask for.
 *
 * 🛑 Validated against the union rather than passed through. An unrecognised
 * variant must fall back to `default` and not reach a `templates.find()` that
 * would answer `null` — because `null` here means "this category has no
 * template", which the picker renders as "No template yet". A typo'd variant
 * would therefore look like missing content rather than a bad request, and
 * nobody would ever find it.
 */
const VARIANTS: readonly CategoryTemplateVariant[] = [
  "default",
  "new_in_box",
  "new_in_packet",
  "pre_owned",
  "replica",
];

/** At most four ancestors on a five-tier tree, so the walk is bounded by shape. */
const MAX_ANCESTORS = 8;

interface CategoryDoc {
  name?: string;
  parentIds?: string[];
  descriptionTemplates?: CategoryDescriptionTemplate[];
  productDefaults?: CategoryProductDefaults;
}

/** What the picker is allowed to see. A new field is withheld until named. */
interface PublicDefaults {
  specifications?: CategorySpecification[];
  inTheBox?: string[];
  defaultCondition?: string;
  defaultAuthenticity?: string;
  seoKeywords?: string[];
  faqTemplates?: { question: string; answer: string }[];
}

function toPublicDefaults(d: CategoryProductDefaults | undefined): PublicDefaults {
  if (!d) return {};
  /*
   * An explicit allow-list, not a spread-and-delete. Root Cause #70: a
   * deny-list keyed on a TypeScript interface is structurally blind to fields
   * the interface does not declare, and this object gains fields over time.
   */
  const out: PublicDefaults = {};
  if (d.specifications?.length) out.specifications = d.specifications;
  if (d.inTheBox?.length) out.inTheBox = d.inTheBox;
  if (d.defaultCondition) out.defaultCondition = d.defaultCondition;
  if (d.defaultAuthenticity) out.defaultAuthenticity = d.defaultAuthenticity;
  if (d.seoKeywords?.length) out.seoKeywords = d.seoKeywords;
  if (d.faqTemplates?.length) out.faqTemplates = d.faqTemplates;
  return out;
}

function pickTemplate(
  doc: CategoryDoc | undefined,
  variant: CategoryTemplateVariant,
): CategoryDescriptionTemplate | null {
  const all = doc?.descriptionTemplates;
  if (!all?.length) return null;
  /*
   * The asked-for variant, else the category's `default`, else nothing. NOT
   * "the first template in the array": a category offering a reproduction
   * body and a new-in-box body has no natural first, and answering with
   * whichever the author happened to list first would silently hand a
   * brand-new listing the reproduction disclosure.
   */
  return (
    all.find((t) => t.variant === variant) ??
    all.find((t) => t.variant === "default") ??
    null
  );
}

interface Inherited {
  template: CategoryDescriptionTemplate | null;
  inheritedFrom: string | null;
  inheritedFromName: string | null;
  defaults: CategoryProductDefaults;
}

/**
 * The `productDefaults` fields the picker can inherit, resolved INDIVIDUALLY.
 *
 * 🛑 PER FIELD, not per object, and the first version of this route got it
 * wrong in exactly the way C2a's `applyCategoryDefaults` was written to avoid.
 *
 * A named-model leaf DOES carry a `productDefaults` object — its
 * `defaultFeatures` (blader, battle type, spin) — while the spec rows and the
 * in-the-box list live on the tier-3 line above it. Stopping at "the leaf has
 * an object, so stop looking" therefore returned the blader and silently
 * dropped the specs, so the picker could never say "this will add 2
 * specification rows". Caught by a test asserting the picker still gets what
 * it needs, which the money-stripping assertion sitting beside it would
 * otherwise have made look fine.
 */
const INHERITABLE_DEFAULT_KEYS = [
  "specifications",
  "inTheBox",
  "defaultCondition",
  "defaultAuthenticity",
  "seoKeywords",
  "faqTemplates",
] as const;

const isEmptyValue = (v: unknown) =>
  v == null || (Array.isArray(v) && v.length === 0);

/** Fill only the keys still missing, from `src`. Returns what is still absent. */
function mergeDefaults(
  into: CategoryProductDefaults,
  src: CategoryProductDefaults | undefined,
): readonly string[] {
  if (src) {
    for (const k of INHERITABLE_DEFAULT_KEYS) {
      if (isEmptyValue(into[k]) && !isEmptyValue(src[k])) {
        (into as Record<string, unknown>)[k] = src[k];
      }
    }
  }
  return INHERITABLE_DEFAULT_KEYS.filter((k) => isEmptyValue(into[k]));
}

/**
 * Walk the ancestors nearest-first for whatever the leaf did not supply.
 *
 * Extracted because `audit-code-quality` flagged the inline version at
 * brace-depth 6, and it was right — "for each ancestor, if we still need a
 * template, if this one has it" is three questions in one block, and the
 * nesting is what hides the ordering guarantee below.
 */
async function resolveInherited(
  parentIds: string[],
  variant: CategoryTemplateVariant,
  seed: Inherited,
): Promise<Inherited> {
  const out: Inherited = { ...seed };
  if (parentIds.length === 0) return out;

  // `parentIds` is root-first/nearest-last, so reverse it. ONE `getAll`: four
  // sequential reads would be four round trips on a route the seller form hits
  // on every category change.
  const nearestFirst = [...parentIds].reverse();
  const ancestors = await categoriesRepository.findByIds(nearestFirst);
  /*
   * 🛑 Re-indexed into the ASKED-FOR order rather than trusted.
   *
   * `findByIds` dedupes and drops ids that no longer exist, so its result is
   * in request order but may be SHORTER — and "nearest ancestor wins" is the
   * whole semantics here. Walking `nearestFirst` instead of the result means a
   * missing ancestor cannot silently promote a more distant one to first
   * place, which would hand a leaf the ROOT's generic body while reporting
   * that it came from the line.
   */
  const byId = new Map(ancestors.map((a) => [a.id, a as CategoryDoc]));
  for (const pid of nearestFirst) {
    const d = byId.get(pid);
    if (!d) continue;
    const found = out.template ? null : pickTemplate(d, variant);
    if (found) {
      out.template = found;
      out.inheritedFrom = pid;
      out.inheritedFromName = d.name ?? null;
    }
    // PER FIELD — see INHERITABLE_DEFAULT_KEYS. Stop only once the template is
    // settled AND no inheritable default is still missing.
    const stillMissing = mergeDefaults(out.defaults, d.productDefaults);
    if (out.template && stillMissing.length === 0) break;
  }
  return out;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const raw = new URL(request.url).searchParams.get("variant") ?? "default";
    const variant = (VARIANTS as readonly string[]).includes(raw)
      ? (raw as CategoryTemplateVariant)
      : "default";

    const leafDoc = await categoriesRepository.findById(id);
    if (!leafDoc) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }
    const leaf = leafDoc as CategoryDoc;

    const parentIds = (leaf.parentIds ?? []).slice(0, MAX_ANCESTORS);
    /*
     * The leaf's own defaults are COPIED into the accumulator rather than
     * referenced, so the per-field merge below cannot mutate the document the
     * repository cached.
     */
    const { template, inheritedFrom, inheritedFromName, defaults } =
      await resolveInherited(parentIds, variant, {
        template: pickTemplate(leaf, variant),
        inheritedFrom: null,
        inheritedFromName: null,
        defaults: { ...(leaf.productDefaults ?? {}) },
      });

    /*
     * 🛑 `placeholders` is RE-DERIVED here and not trusted from the stored
     * template.
     *
     * The field's own contract says absent means "re-parse", never "no slots",
     * and the seeded bodies deliberately leave it unset so there is one
     * implementation rather than a hand-written list that drifts the first time
     * a body is edited. The picker needs the real list to report "2 of 9 slots
     * could not be filled", and a stale list is how a literal `{{series}}`
     * reaches a published description.
     */
    const placeholders = template ? usedPlaceholders(template.body) : [];

    return NextResponse.json(
      {
        success: true,
        data: {
          template: template
            ? { ...template, placeholders }
            : null,
          /** Null when the template came from the category itself. */
          inheritedFrom,
          inheritedFromName,
          defaults: toPublicDefaults(defaults),
        },
      },
      {
        headers: {
          // One hour at the edge. The response is a pure function of
          // (id, variant) over admin-authored content; an hour of staleness
          // costs a seller nothing and removes an invocation per form open.
          "Cache-Control":
            "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    const e = normalizeError(err);
    serverLogger.error("description-template read failed", { message: e.message });
    return NextResponse.json(
      { success: false, error: "Could not load the category template" },
      { status: 500 },
    );
  }
}
