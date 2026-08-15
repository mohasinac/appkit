import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const COMPONENTS_DIR = join(__dirname, "..");

// Regression: these three files call React.useId() (the namespace-import
// style) without "use client" as line 1. appkit/scripts/audit-use-client.mjs
// only pattern-matches destructured `import { useId } from "react"`, so this
// class of violation currently slips past that audit entirely — this test is
// the actual regression guard until the audit script is widened.
describe("'use client' directive present on files using React.useId() via namespace import", () => {
  for (const file of ["DateInput.tsx", "Textarea.tsx", "Select.tsx"]) {
    it(`${file} starts with "use client"`, () => {
      const src = readFileSync(join(COMPONENTS_DIR, file), "utf8");
      const firstLine = src.split("\n")[0].trim();
      expect(firstLine === '"use client";' || firstLine === "'use client'" || firstLine === '"use client"').toBe(true);
    });
  }
});
