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

export async function load(url, context, nextLoad) {
  if (STUB_EXTENSIONS.some((ext) => url.endsWith(ext))) {
    return { format: "module", shortCircuit: true, source: "export default undefined;" };
  }
  return nextLoad(url, context);
}

export async function resolve(specifier, context, nextResolve) {
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
