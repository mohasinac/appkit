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
