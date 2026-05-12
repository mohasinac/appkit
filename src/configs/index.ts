/**
 * appkit consumer build-config helpers.
 *
 * Each helper ships opinionated defaults and accepts consumer overrides.
 * Deep-merges arrays by default; pass `{ replace: true }` to fully replace.
 *
 * Usage:
 *   const { defineNextConfig } = require("@mohasinac/appkit/configs");
 *   module.exports = defineNextConfig({ images: { domains: [...] } });
 */

export { defineNextConfig } from "./next.js";
export { definePostcssConfig } from "./postcss.js";
export { defineTailwindConfig } from "./tailwind.js";
export { defineEslintConfig } from "./eslint.js";
