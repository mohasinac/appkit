#!/usr/bin/env node
/**
 * Replace the shared violet→indigo hero gradient string in every
 * appkit/src/features/about/components/*.tsx file with the canonical
 * `<Section tone="accent-banner">` variant. The `heroBannerClass`
 * prop is unused by any consumer; this codemod removes:
 *   - `const DEFAULT_HERO_CLASS = "bg-gradient-to-br ..."`
 *   - the `heroBannerClass?: string` prop from each interface
 *   - the default assignment in destructure
 *   - rewrites `className={`${heroBannerClass} text-white ...`}` to
 *     `tone="accent-banner" className="text-white ..."`.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..", "src", "features", "about", "components");
const APPLY = process.argv.includes("--apply");

let fixed = 0;
for (const name of readdirSync(ROOT)) {
  if (!name.endsWith(".tsx")) continue;
  const path = join(ROOT, name);
  let src = readFileSync(path, "utf8");
  if (!src.includes("heroBannerClass")) continue;

  // 1. Remove `const DEFAULT_HERO_CLASS = "...";` (possibly multi-line).
  src = src.replace(/\n?const DEFAULT_HERO_CLASS =\s*"[^"]*";\n?/g, "\n");

  // 2. Remove `heroBannerClass?: string;` interface field.
  src = src.replace(/\s*heroBannerClass\?:\s*string;\s*\n/g, "\n");

  // 3. Remove default in destructure: `heroBannerClass = DEFAULT_HERO_CLASS,` or
  //    `heroBannerClass = "bg-gradient-to-br ...",`.
  src = src.replace(/\s*heroBannerClass\s*=\s*(?:DEFAULT_HERO_CLASS|"[^"]+"),?\s*\n/g, "\n");

  // 4. Replace `className={`${heroBannerClass} <rest>`}` with
  //    `tone="accent-banner" className="<rest>"`.
  src = src.replace(
    /className=\{`\$\{heroBannerClass\}\s*([^`]*)`\}/g,
    (_m, rest) => `tone="accent-banner" className="${rest.trim()}"`,
  );

  // 5. Any leftover bare `heroBannerClass` reference becomes empty string —
  //    these would be defensive sanity checks; skip if rare.

  if (APPLY) writeFileSync(path, src);
  fixed++;
}
console.log(`${APPLY ? "Updated" : "Would update"} ${fixed} files.`);
