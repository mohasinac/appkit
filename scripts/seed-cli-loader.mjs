/**
 * ESM resolver hook for seed-cli.mjs.
 *
 * appkit's dist emits bare relative imports without `.js` extensions
 * (TS build is bundler-target, not Node). Node ESM is strict and refuses
 * them. This hook tries appending `.js` and `/index.js` when a resolution
 * fails with ERR_MODULE_NOT_FOUND.
 */

// Stub out non-JS asset imports (CSS, etc.) — appkit's dist contains
// `import "./foo.css"` side-effect statements that Node ESM can't load.
const STUB_EXTENSIONS = [".css", ".scss", ".sass", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"];

// server-only / client-only are Next.js-specific sentinel packages — their
// entire module body unconditionally throws, because their whole purpose is
// a Next.js-compiler-time + Next.js-runtime guard against importing a
// server-only (or client-only) module from the wrong side of the boundary.
// A raw Node script (this CLI) is neither a Next.js Server Component nor a
// Client Component, so the guard is meaningless here — the main
// @mohasinac/appkit barrel transitively reaches a module (e.g.
// features/contact/email.tsx) that imports "server-only" at the top level,
// which crashes the whole CLI on load. Stub both to a no-op module. Found
// 2026-08-17 debugging the CLI seed tool being unable to import appkit at all.
const SENTINEL_SPECIFIERS = new Set(["server-only", "client-only"]);

export async function load(url, context, nextLoad) {
  if (STUB_EXTENSIONS.some((ext) => url.endsWith(ext))) {
    return { format: "module", shortCircuit: true, source: "export default undefined;" };
  }
  return nextLoad(url, context);
}

export async function resolve(specifier, context, nextResolve) {
  if (SENTINEL_SPECIFIERS.has(specifier)) {
    return { url: `data:text/javascript,export default undefined;`, shortCircuit: true };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err?.code !== "ERR_MODULE_NOT_FOUND" && err?.code !== "ERR_UNSUPPORTED_DIR_IMPORT") throw err;
    if (specifier.endsWith(".js") || specifier.endsWith(".mjs") || specifier.endsWith(".cjs")) throw err;
    // Try with .js suffix (most common case)
    try {
      return await nextResolve(`${specifier}.js`, context);
    } catch {}
    // Try as a directory index
    try {
      return await nextResolve(`${specifier}/index.js`, context);
    } catch {}
    throw err;
  }
}
