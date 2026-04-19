/**
 * Post-build: copy non-TypeScript assets (CSS, etc.) from src/ to dist/
 * preserving the directory structure.
 */
import { readdir, copyFile, mkdir, stat } from "fs/promises";
import { join, relative, dirname, extname } from "path";

const ASSET_EXTENSIONS = new Set([".css", ".json", ".svg", ".png"]);
const SRC = new URL("../src", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const DIST = new URL("../dist", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

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

console.log(`Copied ${assets.length} asset file(s) to dist/`);
