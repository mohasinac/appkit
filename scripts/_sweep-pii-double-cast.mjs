#!/usr/bin/env node
// Sweep `as unknown as Record<string, JsonValue>` casts that piped through
// pii-encrypt helpers (decryptPiiFields/encryptPiiFields) — now that they
// accept `<T extends object>`, the cast is no-op and can be dropped.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src/features";

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) yield full;
  }
}

const PATTERNS = [
  // decryptPiiFields(X as unknown as Record<string, JsonValue>, [..])
  {
    re: /decryptPiiFields\(\s*(\w+)\s+as\s+unknown\s+as\s+Record<string,\s*JsonValue>,/g,
    repl: "decryptPiiFields($1,",
  },
  // encryptPiiFields(X as unknown as Record<string, JsonValue>, [..])
  {
    re: /encryptPiiFields\(\s*(\w+)\s+as\s+unknown\s+as\s+Record<string,\s*JsonValue>,/g,
    repl: "encryptPiiFields($1,",
  },
  // multi-line variants — X[\s\n]*as unknown as Record<string, JsonValue>,
  {
    re: /(\w+)\s+as\s+unknown\s+as\s+Record<string,\s*JsonValue>,/g,
    repl: "$1,",
    multiline: true,
  },
];

let changed = 0;
let sites = 0;
for (const file of walk(ROOT)) {
  let src = readFileSync(file, "utf8");
  const before = src;
  for (const p of PATTERNS) {
    src = src.replace(p.re, p.repl);
  }
  if (src !== before) {
    const diff = (before.match(/as\s+unknown\s+as\s+Record<string,\s*JsonValue>/g) || []).length -
                 (src.match(/as\s+unknown\s+as\s+Record<string,\s*JsonValue>/g) || []).length;
    sites += diff;
    writeFileSync(file, src);
    changed++;
    console.log(`${file}: -${diff} sites`);
  }
}
console.log(`\nTotal: ${changed} files, -${sites} sites`);
