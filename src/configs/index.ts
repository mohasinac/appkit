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

export { defineNextConfig } from "./next";
export { definePostcssConfig } from "./postcss";
export { defineTailwindConfig } from "./tailwind";
export { defineEslintConfig } from "./eslint";
