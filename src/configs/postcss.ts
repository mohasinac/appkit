/**
 * definePostcssConfig — appkit-aware PostCSS config factory.
 *
 * Ships autoprefixer as the only default plugin for the consumer's own CSS
 * (appkit's Tailwind utilities are pre-compiled into dist/tailwind-utilities.css
 * and never need to pass through the consumer's PostCSS pipeline).
 *
 * @example
 * ```js
 * // postcss.config.js
 * const { definePostcssConfig } = require("@mohasinac/appkit/configs");
 * module.exports = definePostcssConfig();
 * ```
 */

export interface PostcssConfigOverride {
  // audit-unknown-ok: PostCSS config — third-party shape
  plugins?: Record<string, unknown>;
}

export function definePostcssConfig(override: PostcssConfigOverride = {}) {
  return {
    plugins: {
      autoprefixer: {},
      ...override.plugins,
    },
  };
}
