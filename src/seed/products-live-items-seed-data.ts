/*
 * WHY: `listingType: "live"` is schema-specific to animals/plants (ProductLiveItemMeta:
 *      species, ageMonths, sex, jurisdictionAllowed, vendor verification, CITES permit) —
 *      genuinely inapplicable to this catalog's spinning-tops/collectibles theme, so left
 *      deliberately empty in the real seed rather than forcing a nonsensical example.
 *      Testers can still exercise the live-item buyer flow against the disposable
 *      tester-sandbox fixture in appkit/src/features/tester/seed-data/products-tester-seed-data.ts.
 * WHAT: Exports an empty array — kept as a stub so seed/index.ts and the seed API route's
 *       SEED_DATA_MAP.products concatenation keep working without a code change elsewhere.
 *
 * EXPORTS:
 *   productsLiveItemsSeedData — empty array
 *
 * @tag domain:products,live-items
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { ProductDocument } from "../features/products/schemas/firestore";

export const productsLiveItemsSeedData: Partial<ProductDocument>[] = [];
