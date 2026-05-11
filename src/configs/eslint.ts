/**
 * defineEslintConfig — appkit-aware ESLint flat-config factory.
 *
 * Returns a base config array with TypeScript + React + Next.js rules.
 * Consumer-specific rules are merged in.
 *
 * @example
 * ```js
 * // eslint.config.js
 * const { defineEslintConfig } = require("@mohasinac/appkit/configs");
 * module.exports = defineEslintConfig();
 * ```
 */

export interface EslintConfigOverride {
  rules?: Record<string, unknown>;
  ignores?: string[];
}

export function defineEslintConfig(override: EslintConfigOverride = {}) {
  return [
    {
      ignores: [
        "node_modules/**",
        ".next/**",
        "dist/**",
        ...(override.ignores ?? []),
      ],
    },
    {
      rules: {
        // Prohibit hardcoded route strings — use ROUTES.* constants
        "no-restricted-syntax": [
          "warn",
          {
            selector:
              "Literal[value=/^\\/[a-z]+(\\?|#|$)/]",
            message:
              "Use ROUTES.* constants from @mohasinac/appkit instead of hardcoded route strings.",
          },
        ],
        ...override.rules,
      },
    },
  ];
}
