import type { SellerProductDraft } from "../components/SellerProductShell";

/**
 * Seller listing form draft <-> product write payload.
 *
 * ## The bug this closes
 *
 * `SellerProductDraft` is FLAT — `classifiedCity`, `liveSpecies`,
 * `digitalCodeDelivery`, `printSize` — because that is the shape a form wants:
 * one key per control, no nesting to thread through `onChange`.
 *
 * `productCreateSchema` is NESTED — `classified.meetupArea.city`,
 * `liveItem.species`, `digitalCode.codeDeliveryMethod`, `printMeta.size` —
 * because that is the shape `ProductDocument` stores.
 *
 * Nothing translated between them. Every `store/*\/new/page.tsx` spread the
 * draft straight into `createSellerProductAction`, and `productBaseSchema` is
 * a plain `z.object()` with no `.passthrough()`, so **every flat per-type key
 * was stripped before the write**. A seller filled in a classified's meetup
 * city, a live animal's species and permitted jurisdictions, a digital code's
 * delivery method, or an art print's size and edition — pressed Publish, got a
 * success toast — and the listing was saved without the fields that made it
 * that KIND of listing.
 *
 * ## Why this lives in the ACTION, not in the pages
 *
 * There are ~10 `new/page.tsx` and ~10 `[id]/edit/page.tsx` files and every
 * one of them does `{ ...draft, listingType, status }`. Applying the mapping
 * at each is 20 chances to forget, and a new listing type's page would start
 * out broken in exactly the way this fixes. `createSellerProductAction` and
 * `sellerUpdateProductAction` are the single choke point every seller write
 * already passes through, so the mapping happens once and cannot be bypassed
 * by a page that did not know about it (the lesson of Root Cause #75).
 *
 * ## Round-trip
 *
 * `draftToProductInput` and `productToDraft` are a matched pair in one file so
 * they cannot drift: a field added to one and not the other is visible in a
 * single screen of code. The edit pages need the inverse to seed the form from
 * a stored document.
 */

/**
 * The parts of a stored product this mapper reads.
 *
 * Declared structurally rather than importing `ProductDocument`: the inbound
 * value comes from a server action's `JsonValue` payload where dates are
 * strings, and every block is optional because documents written before the
 * nested shapes existed carry none of them.
 */
export interface StoredProductBlocks {
  finalSale?: boolean;
  returnPolicy?: string;
  classified?: {
    meetupArea?: { city?: string; locality?: string; pincode?: string };
    acceptsShipping?: boolean;
    negotiable?: boolean;
  };
  digitalCode?: {
    codeDeliveryMethod?: string;
    codePoolSize?: number;
    redemptionInstructions?: string;
    expiresAt?: string;
  };
  liveItem?: {
    species?: string;
    ageMonths?: number;
    sex?: string;
    careInfo?: string;
    transport?: { method?: string; handlingFee?: number };
    jurisdictionAllowed?: string[];
    cites?: string;
  };
  printMeta?: { size?: string; material?: string; finish?: string; editionSize?: number };
}

/**
 * The nested blocks this mapper WRITES, plus whatever else the draft carried.
 * `ProductWritePayload` is deliberately not `ProductDocument`: the draft holds
 * form-shaped values (ISO date strings, a `MediaField` video) that the write
 * schema coerces, so typing it as the document would be a lie the compiler
 * would then make everyone cast around.
 */
export interface ProductWritePayload {
  classified?: NonNullable<StoredProductBlocks["classified"]>;
  digitalCode?: NonNullable<StoredProductBlocks["digitalCode"]>;
  liveItem?: NonNullable<StoredProductBlocks["liveItem"]>;
  printMeta?: NonNullable<StoredProductBlocks["printMeta"]>;
  [key: string]: unknown;
}

function pick<T>(v: T | undefined | null): T | undefined {
  return v === undefined || v === null || v === "" ? undefined : v;
}

/** Drop keys whose value is undefined so they never reach Firestore. */
function compact<T extends object>(obj: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as { [key: string]: unknown })[k] = v;
  }
  return out;
}

/**
 * The flat draft keys this mapper OWNS.
 *
 * Stripped from the payload after being folded into their nested homes — the
 * write schema does not name them, so leaving them in would be harmless today
 * and confusing forever ("is `classifiedCity` stored or not?").
 */
const OWNED_FLAT_KEYS = [
  "classifiedCity", "classifiedLocality", "classifiedPincode",
  "classifiedContactMethod", "classifiedAcceptsShipping", "classifiedNegotiable",
  "digitalCodeDelivery", "digitalCodePoolSize",
  "digitalCodeRedemptionInstructions", "digitalCodeExpiresAt",
  "liveSpecies", "liveAgeMonths", "liveSex", "liveCareInfo",
  "liveTransportMethod", "liveHandlingFee", "liveJurisdictions", "liveCites",
  "printSize", "printMaterial", "printFinish", "printEditionSize",
] as const;

/**
 * Fold the draft's flat per-type keys into the nested blocks the write schema
 * expects. Every other key passes through untouched.
 *
 * A block is emitted only when the draft actually carries something for it, so
 * saving a standard listing does not write an empty `classified: {}`.
 */
export function draftToProductInput(
  draft: SellerProductDraft & { [key: string]: unknown },
): ProductWritePayload {
  const out: ProductWritePayload = { ...draft };
  for (const k of OWNED_FLAT_KEYS) delete out[k];

  // ── classified ────────────────────────────────────────────────────────────
  if (pick(draft.classifiedCity) !== undefined) {
    out.classified = compact({
      meetupArea: compact({
        city: draft.classifiedCity as string,
        locality: pick(draft.classifiedLocality),
        pincode: pick(draft.classifiedPincode),
      }),
      acceptsShipping: draft.classifiedAcceptsShipping,
      negotiable: draft.classifiedNegotiable,
    });
  }

  // ── digital code ──────────────────────────────────────────────────────────
  if (pick(draft.digitalCodeDelivery) !== undefined) {
    out.digitalCode = compact({
      codeDeliveryMethod: draft.digitalCodeDelivery,
      codePoolSize: pick(draft.digitalCodePoolSize),
      redemptionInstructions: pick(draft.digitalCodeRedemptionInstructions),
      expiresAt: pick(draft.digitalCodeExpiresAt),
    });
  }

  // ── live item ─────────────────────────────────────────────────────────────
  if (pick(draft.liveSpecies) !== undefined) {
    out.liveItem = compact({
      species: draft.liveSpecies as string,
      ageMonths: pick(draft.liveAgeMonths),
      sex: pick(draft.liveSex),
      careInfo: pick(draft.liveCareInfo),
      /*
       * `transport` is a REQUIRED object on the schema, and `method` inside it
       * is required too — so a live listing whose form left the transport
       * method blank must still produce the object, or the whole `liveItem`
       * block fails to parse and takes the species with it. "courier" is the
       * form's own default.
       */
      transport: compact({
        method: draft.liveTransportMethod ?? "courier",
        handlingFee: pick(draft.liveHandlingFee),
      }),
      // Required, min 1. Left empty the schema rejects the listing with a
      // real message — which is correct: shipping a live animal into a
      // jurisdiction that forbids it is what the field exists to prevent.
      jurisdictionAllowed: draft.liveJurisdictions ?? [],
      // `cites` is a STRING permit number on the document, while the form
      // carries a boolean "CITES applies" checkbox. Only the affirmative case
      // means anything, and it means "documented" until a number is entered.
      cites: draft.liveCites ? "documented" : undefined,
    });
  }

  // ── print meta (art + stickers share one block) ───────────────────────────
  const printEntries = compact({
    size: pick(draft.printSize),
    material: pick(draft.printMaterial),
    finish: pick(draft.printFinish),
    editionSize: pick(draft.printEditionSize),
  });
  if (Object.keys(printEntries).length > 0) out.printMeta = printEntries;

  return out;
}

/**
 * The inverse — seed the form from a stored document.
 *
 * Tolerant of documents written before the nested blocks existed: a missing
 * block yields undefined flat keys, which render as empty inputs rather than
 * throwing.
 */
export function productToDraft(product: StoredProductBlocks): Partial<SellerProductDraft> {
  const { classified, digitalCode, liveItem, printMeta } = product;

  return compact({
    /*
     * Flat fields the edit pages' hand-written `initialValues` blocks omit.
     *
     * Not a nesting mismatch like the rest of this function — just fields
     * nobody added to ten near-identical literals. `finalSale` matters most:
     * unseeded it renders as `undefined`, which `isFinalSale` reads as TRUE,
     * so a listing the seller had opted into returns would open its own edit
     * form showing "final sale". The stored value survives an untouched save
     * (an absent key is stripped, and the update is partial), but the form was
     * telling the seller something untrue about their own listing.
     */
    finalSale: product.finalSale,
    returnPolicy: product.returnPolicy,

    classifiedCity: classified?.meetupArea?.city,
    classifiedLocality: classified?.meetupArea?.locality,
    classifiedPincode: classified?.meetupArea?.pincode,
    classifiedAcceptsShipping: classified?.acceptsShipping,
    classifiedNegotiable: classified?.negotiable,

    digitalCodeDelivery: digitalCode?.codeDeliveryMethod as
      | "auto-claim" | "manual-email" | undefined,
    digitalCodePoolSize: digitalCode?.codePoolSize,
    digitalCodeRedemptionInstructions: digitalCode?.redemptionInstructions,
    digitalCodeExpiresAt: digitalCode?.expiresAt,

    liveSpecies: liveItem?.species,
    liveAgeMonths: liveItem?.ageMonths,
    liveSex: liveItem?.sex as "male" | "female" | "unknown" | "n/a" | undefined,
    liveCareInfo: liveItem?.careInfo,
    liveTransportMethod: liveItem?.transport?.method as
      | "courier" | "in-person" | "specialist" | undefined,
    liveHandlingFee: liveItem?.transport?.handlingFee,
    liveJurisdictions: liveItem?.jurisdictionAllowed,
    // String -> boolean, mirroring the outbound direction: any recorded permit
    // means the checkbox is ticked.
    liveCites: liveItem?.cites ? true : undefined,

    printSize: printMeta?.size,
    printMaterial: printMeta?.material,
    printFinish: printMeta?.finish,
    printEditionSize: printMeta?.editionSize,
  }) as Partial<SellerProductDraft>;
}
