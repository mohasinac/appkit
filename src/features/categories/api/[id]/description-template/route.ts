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
import { getCompositionsForCategory } from "../../../../../_internal/server/features/parts/data";
import { getBeysForCategory } from "../../../../../_internal/server/features/beys/data";
import {
  PART_BREAKDOWN_SLOT,
  formatPartBreakdown,
  stripSlotLine,
} from "../../../../parts/utils/part-breakdown";

/**
 * ── The TAXONOMY slots ────────────────────────────────────────────────────
 *
 * Measured across the seeded bodies: 45 `{{title}}` · 21 `{{siteName}}` ·
 * 18 `{{series}}` · 17 `{{category}}` · 13 `{{condition}}` · 6 `{{brand}}` ·
 * 5 `{{partBreakdown}}` · 3 `{{categoryPath}}`. The seller form supplies four
 * of those from the draft it is holding (title, brand, condition, siteName)
 * and this route supplied exactly one (`partBreakdown`) — so
 * **`{{category}}`, `{{categoryPath}}`, `{{series}}` and `{{system}}` could
 * never resolve on any listing**, and the picker reported "4 of 9 slots could
 * not be filled" on every single category, forever.
 *
 * All four are facts about the CATEGORY, not the draft, so the form cannot
 * compute them and this is the only place that can. They ride the existing
 * response exactly as `partBreakdown` does.
 *
 * 🛑 `series` and `system` are REAL FIELDS, not invented from the tree.
 * `BeyDocument.series` is "the retail series" (`Beyblade Burst QuadStrike`)
 * and `BeyDocument.system` is "the hardware generation" (`4D System`,
 * `Hybrid Wheel System`) — which is why the seeded body renders them as two
 * separate rows. A leaf pairs with a bey through `BeyDocument.categoryId`,
 * and `getBeysForCategory` is the inverse of exactly that.
 *
 * 🛑 Resolved against the LEAF, never an ancestor — a bey describes one
 * model, so inheriting a line's would tell every listing on that line it is
 * the model that happened to join to the line node.
 */
const TAXONOMY_SLOTS = ["category", "categoryPath", "series", "system"] as const;

/** Slots that need the bey read. Checked before paying for it. */
const BEY_SLOTS = ["series", "system"] as const;

/**
 * `Spinning Tops › Beyblade X › Attack Types › Dran Sword`.
 *
 * A chevron rather than a slash: the body renders it inside
 * `<li><strong>Category:</strong> …</li>` next to prose, and a slash there
 * reads as a URL.
 */
const CATEGORY_PATH_SEPARATOR = " › ";

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
  /**
   * Every ancestor's name, NEAREST-FIRST, from the docs the walk already
   * fetched — so `{{categoryPath}}` costs zero extra reads.
   *
   * 🛑 Taken from the fetched SET and not accumulated inside the loop below,
   * because that loop `break`s as soon as the template and the defaults are
   * settled. Accumulating would give a chain that stops wherever the
   * inheritance happened to stop, so the path a listing printed would depend
   * on which ancestor carried the body.
   */
  ancestorNames: string[];
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
  // See `Inherited.ancestorNames` — before the loop, which may break early.
  out.ancestorNames = nearestFirst
    .map((pid) => byId.get(pid)?.name?.trim())
    .filter((n): n is string => Boolean(n));
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
    const { template, inheritedFrom, inheritedFromName, defaults, ancestorNames } =
      await resolveInherited(parentIds, variant, {
        template: pickTemplate(leaf, variant),
        inheritedFrom: null,
        inheritedFromName: null,
        defaults: { ...(leaf.productDefaults ?? {}) },
        ancestorNames: [],
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

    /*
     * ── D12: the `{{partBreakdown}}` slot ──────────────────────────────────
     *
     * 🛑 READ ONLY IF THE BODY ASKS FOR IT. Nothing outside the Beyblade lines
     * carries the slot, so this is a third read on roughly a fifth of the
     * tree and zero reads everywhere else — a TCG set or a Hot Wheels casting
     * pays nothing for a concept it does not have.
     *
     * 🛑 Resolved against the LEAF, never an ancestor. A composition describes
     * one model; inheriting a line's would hand every Burst GT listing the
     * parts of whichever model happened to join to the line node.
     *
     * 🛑 And when there is none, the LINE IS STRIPPED rather than left to
     * interpolate to an empty string — otherwise a listing with no recorded
     * composition renders an empty "Parts:" bullet, which reads as broken
     * data rather than as absent data.
     *
     * Safe on a `public` cache: part names, slots and weights are facts about
     * mouldings. No money, no seller identity, nothing gated.
     */
    let body = template?.body ?? "";
    const slots: Record<string, string> = {};
    if (template && placeholders.includes(PART_BREAKDOWN_SLOT)) {
      const compositions = await getCompositionsForCategory(id);
      const breakdown = formatPartBreakdown(compositions);
      if (breakdown) slots[PART_BREAKDOWN_SLOT] = breakdown;
      else body = stripSlotLine(body, PART_BREAKDOWN_SLOT);
    }

    /*
     * ── The taxonomy slots ────────────────────────────────────────────────
     *
     * See TAXONOMY_SLOTS. `category` and `categoryPath` are free — the leaf
     * and its ancestors are already in hand — so they are built
     * unconditionally and the `placeholders` check below decides whether they
     * are sent.
     *
     * The bey read is gated on the body actually asking, the same way the
     * composition read is: nothing outside the Beyblade lines carries
     * `{{series}}`/`{{system}}`, so a TCG set or a Hot Wheels casting pays
     * nothing for a concept it does not have.
     */
    if (template) {
      const taxonomy: Record<string, string> = {
        category: (leaf.name ?? "").trim(),
        // Root-first: `ancestorNames` is nearest-first, so reverse it and put
        // the leaf on the end. This is the order a breadcrumb reads in.
        categoryPath: [...ancestorNames]
          .reverse()
          .concat((leaf.name ?? "").trim())
          .filter(Boolean)
          .join(CATEGORY_PATH_SEPARATOR),
      };

      if (BEY_SLOTS.some((s) => placeholders.includes(s))) {
        const beys = await getBeysForCategory(id);
        /*
         * The first pairing only, matching `formatPartBreakdown`'s rule and
         * for the same reason: 22 leaves pair with more than one bey (a
         * remake shares a model's name), and concatenating two retail series
         * would describe a release that does not exist.
         */
        const bey = beys[0];
        taxonomy.series = (bey?.series ?? "").trim();
        taxonomy.system = (bey?.system ?? "").trim();
      }

      for (const slot of TAXONOMY_SLOTS) {
        if (!placeholders.includes(slot)) continue;
        const value = taxonomy[slot] ?? "";
        if (value) {
          slots[slot] = value;
          continue;
        }
        /*
         * 🛑 ABSENCE REMOVES THE LINE — `partBreakdown`'s contract, applied
         * here for the same reason: `interpolate` resolves an unfilled slot
         * to an empty string, so `<li><strong>System:</strong> {{system}}</li>`
         * would render an empty bullet that reads as broken data.
         *
         * 🛑 KNOWN CONSEQUENCE, stated rather than guarded against (as the
         * strip helper's own header does): `{{series}}` appears both as a
         * standalone row AND mid-sentence ("from the {{series}} line"), so a
         * leaf with no paired bey loses that whole sentence instead of
         * printing "from the  line". Losing a sentence is the better of the
         * two, and the seller sees the picker's note either way — but a
         * template author adding an inline slot should know the line goes
         * with it.
         */
        body = stripSlotLine(body, slot);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          template: template
            ? { ...template, body, placeholders: usedPlaceholders(body) }
            : null,
          /**
           * Slot values the CLIENT cannot compute, merged UNDER the form's own
           * context so a draft-derived value always wins — the two key spaces
           * are disjoint today and this is what keeps them safe if they stop
           * being.
           */
          slots,
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
