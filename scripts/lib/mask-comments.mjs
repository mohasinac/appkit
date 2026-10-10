/*
 * Blank out comments, preserving length and newlines so every index still lines
 * up with the original source.
 *
 * 🛑 ONE DEFINITION, TWO CONSUMERS — fix-esm-extensions.mjs and
 * verify-esm-dist.mjs. It lives here rather than in either of them because a
 * checker and the fixer it guards must agree on what counts as code. They did
 * not at first: the verifier had no masking and re-flagged 14 JSDoc usage
 * EXAMPLES that the rewriter had correctly skipped, reporting documentation as
 * corruption.
 *
 * 🛑 REQUIRED, not tidiness. `tsc` keeps JSDoc in the emitted JS, and appkit's
 * JSDoc is full of examples that look exactly like imports:
 *     cli/index.js              *   import features from "../../features.config";
 *     instrumentation/index.js  * await import("./src/providers.config");
 *     bind-all.js               *   import { CONSUMER_FUNCTIONS } from "./consumer-functions";
 *
 * 🛑 AND IT MUST BE A CHARACTER WALK, NOT A REGEX. The obvious
 * non-greedy block-comment pattern is wrong here and wrong silently: a
 * slash-star occurring inside a STRING LITERAL opens a comment the author never
 * wrote, and the match then blanks everything up to the next close — swallowing
 * real code. Measured on dist/server.js: the regex version masked away exactly
 * the 227 extensionless specifiers (544 raw matches became 317), so the
 * rewriter "fixed" 317 of 544 and reported success. Same failure CLAUDE.md
 * records for audit-theme-drift, where a brace inside a CSS comment truncated
 * the block and hid every token below it.
 *
 * 🛑 `split("")`, NOT `Array.from(src)`. `Array.from` iterates CODE POINTS, so
 * a surrogate pair — every emoji in appkit's JSDoc — becomes ONE element, while
 * `src[i]` indexes CODE UNITS. The two then disagree by one for everything
 * after the first emoji and the mask lands at the wrong offset. It corrupted 34
 * of 2,387 files before being caught, and the symptom named the cause once
 * seen: `}from`, `awaitimport`, `Text from "…"i"` — edits applied a character
 * or two to the left, eating the space or brace before them.
 *
 * @tag domain:build
 * @tag layer:lib
 * @tag access:node-only
 * @tag sideEffects:none — pure function
 */

export function maskComments(src) {
  const out = src.split("");
  const n = src.length;
  let i = 0;

  while (i < n) {
    const c = src[i];
    const next = src[i + 1];

    /* String and template literals are skipped WHOLE, never masked — this is
     * the entire reason a regex cannot do this job. */
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i += 1;
      while (i < n) {
        if (src[i] === "\\") {
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (c === "/" && next === "*") {
      const start = i;
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
      i = Math.min(i + 2, n);
      for (let k = start; k < i; k += 1) if (out[k] !== "\n") out[k] = " ";
      continue;
    }

    if (c === "/" && next === "/") {
      const start = i;
      while (i < n && src[i] !== "\n") i += 1;
      for (let k = start; k < i; k += 1) out[k] = " ";
      continue;
    }

    i += 1;
  }

  return out.join("");
}
