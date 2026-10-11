/**
 * Post-build: copy non-TypeScript assets (CSS, etc.) from src/ to dist/
 * preserving the directory structure.
 */
import { readdir, copyFile, mkdir, stat } from "fs/promises";
import { join, relative, dirname, extname } from "path";

const ASSET_EXTENSIONS = new Set([".css", ".json", ".svg", ".png"]);
const SRC = new URL("../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const DIST = new URL("../dist", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (ASSET_EXTENSIONS.has(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

const assets = await walk(SRC);
for (const src of assets) {
  const rel = relative(SRC, src);
  const dst = join(DIST, rel);
  await mkdir(dirname(dst), { recursive: true });
  await copyFile(src, dst);
}

/*
 * Vendor third-party stylesheets into dist so they can join the @import chain
 * instead of being imported from JS.
 *
 * 🛑 WHY: a JS `import "pkg/dist/style.css"` is invisible to bundle-css (which
 * only flattens relative @imports from styles.css) AND fatal to anything that
 * resolves with Node, because Node cannot load CSS at any path. One such line
 * in ImageEditor.tsx put react-advanced-cropper's stylesheet into appkit's
 * SERVER graph:
 *   server.js -> …/seo/sitemap -> features/blog -> BlogPostForm
 *             -> features/media -> ImageEditor -> react-advanced-cropper/…css
 * which is what made `serverExternalPackages: ["@mohasinac/appkit"]` fail.
 *
 * Copied at build time rather than committed into src/, so the file cannot
 * drift from the installed dependency version.
 *
 * Runs BEFORE bundle-css.mjs (see the build script order) — styles.css
 * @imports `./vendor/…`, and that path has to exist by then.
 */
const VENDOR_CSS = [
  ["react-advanced-cropper/dist/style.css", "vendor/react-advanced-cropper.css"],
];

const NODE_MODULES = new URL("../node_modules", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ROOT_NODE_MODULES = new URL("../../node_modules", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

let vendored = 0;
for (const [from, to] of VENDOR_CSS) {
  const candidates = [join(NODE_MODULES, from), join(ROOT_NODE_MODULES, from)];
  let found = null;
  for (const c of candidates) {
    try {
      await stat(c);
      found = c;
      break;
    } catch {
      /* try the next root — appkit's own node_modules, then the consumer's */
    }
  }
  if (!found) {
    console.error(
      `[copy-assets] FATAL: vendor stylesheet not found: ${from}\n` +
        "  styles.css @imports it, so bundle-css would emit a broken bundle.",
    );
    process.exit(1);
  }
  const dst = join(DIST, to);
  await mkdir(dirname(dst), { recursive: true });
  await copyFile(found, dst);
  vendored += 1;
}

console.log(`Copied ${assets.length} asset file(s) + ${vendored} vendor stylesheet(s) to dist/`);
