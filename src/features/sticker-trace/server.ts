/*
 * WHY: A Cloud Function must not inhale the Next.js server barrel. Importing
 *      `@mohasinac/appkit/server` from functions/ dragged in
 *      react-server-dom-webpack and @vercel/og's wasm and FAILED the tsup
 *      build — Root Cause #18, caught by the bundler rather than by review.
 * WHAT: A narrow server entry for the sticker tracer, re-exporting only what a
 *       Function binding injects, each from its DEFINING module.
 *
 * 🛑 This is one of the carve-outs Root Cause #18 permits: a package's public
 * API contract. `_internal/*` is deliberately not an exported subpath, so a
 * consumer implementing the codec seam or binding the handlers has no other way
 * in. Modelled on the existing `./features/whatsapp-bot/server` key.
 *
 * 🛑 Keep it NARROW. Every symbol added here widens what a Functions bundle
 * must resolve, and the whole reason this file exists is that the wide barrel
 * could not be bundled at all.
 *
 * EXPORTS: runCoordinator, runShard, runFinalizer, readScanBytes,
 *   readRunGeometry, writeRunArtifact, rasterisePartToBox, + their types
 *
 * @tag domain:sticker-trace
 * @tag layer:feature
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:functions/sticker-trace
 * @tag sideEffects:none
 */

export { runCoordinator, type CoordinatorDeps } from "../../_internal/server/features/sticker-trace/coordinator";
export { runShard, type ShardDeps } from "../../_internal/server/features/sticker-trace/shard";
export { runFinalizer, type FinalizerDeps } from "../../_internal/server/features/sticker-trace/finalizer";
export {
  readScanBytes,
  readRunGeometry,
  writeRunArtifact,
  type RunGeometry,
} from "../../_internal/server/features/sticker-trace/storage";
export { rasterisePartToBox } from "../../_internal/shared/features/sticker-trace/math/rasterize-path";

/*
 * The cut-file exporter, for the finalizer binding.
 *
 * 🛑 `buildCutFileBytes` and not `buildExportSet`: the Function has a runId and
 * a sheetId, not geometry and a pixels-per-mm figure. Exporting the pure
 * function here would make every binding re-implement the artifact read and the
 * working-raster-to-original dpi bridge — and that bridge is exactly where a
 * silent factor-of-N millimetre error lives.
 */
export { buildCutFileBytes, buildCutFileForRun } from "../../_internal/server/features/sticker-trace/build-cut-file";

/*
 * Everything the PDF mosaic needs, assembled server-side.
 *
 * 🛑 `pdfkit` is Node-only and stays in functions/, but the DATA — the sheet,
 * the promoted PNGs and the layout — comes from here. Letting the Function
 * gather it would mean re-deriving the nest, and a preview that disagrees with
 * the printed sheet about where a sticker sits is worse than no preview.
 */
export {
  collectMosaicInputs,
  type MosaicInputs,
  type MosaicPartInput,
} from "../../_internal/server/features/sticker-trace/mosaic-inputs";

/*
 * The page-id union, exported so a Function can accept one without casting.
 *
 * It was briefly reconstructed at the call site with a conditional type, which
 * type-checked and was unreadable — and an unreadable cast is how an invalid
 * page id eventually gets through. Exporting the union lets the compiler do it.
 */
export type { PrintPageSizeId } from "../../_internal/shared/features/sticker-trace/export/page-sizes";

/*
 * The CODEC SEAM's types — the contract `functions/sticker-trace/sharp-codec.ts`
 * implements.
 *
 * 🛑 These were only reachable through `@mohasinac/appkit/server`, so the one
 * file this entry exists to serve still imported the wide barrel — and that is
 * the exact failure described at the top of this file, still live. It did not
 * matter that the import was `import type`: `./server` → `dist/server.js`
 * reaches `next/og` (67 `next/*` imports over 1,249 modules), tsup has
 * `noExternal: ["@mohasinac/appkit"]`, and the build died on two unresolved
 * `react-server-dom-webpack/*` requires and two `@vercel/og` .wasm files —
 * naming neither appkit nor the importer.
 *
 * Type-only re-exports are erased, so this widens the TYPE surface and adds
 * nothing to the bundle — which is what keeps the "keep it NARROW" rule above
 * satisfied.
 *
 * `Rect` keeps its alias: it is a plain rectangle in a module full of
 * sticker-trace geometry, and `StickerRect` is what every consumer calls it.
 */
export type {
  DecodeOptions,
  ImageCodec,
  PreviewOptions,
  ProbeResult,
} from "../../_internal/shared/features/sticker-trace/codec";
export type {
  DecodedRaster,
  EncodedImage,
  Rect as StickerRect,
} from "../../_internal/shared/features/sticker-trace/types";
