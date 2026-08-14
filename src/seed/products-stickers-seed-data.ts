/*
 * WHY: Sticker listings are out of scope for the minimal Beyblade-focused demo catalog.
 * WHAT: Exports an empty array — kept as a stub so seed/index.ts and the seed API route's
 *       SEED_DATA_MAP.products concatenation keep working without a code change elsewhere.
 *
 * EXPORTS:
 *   productsStickersSeedData — empty array
 *
 * @tag domain:products,stickers
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import { ProductDocument } from "../features/products/schemas/firestore";

export const productsStickersSeedData: Partial<ProductDocument>[] = [];
