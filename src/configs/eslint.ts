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
  // audit-unknown-ok: ESLint config — third-party shape
  rules?: Record<string, unknown>;
  ignores?: string[];
}

/**
 * `no-restricted-syntax` selectors that mirror the variant-catalogue audits
 * (`audit-html-wrappers.mjs` raw-tag rules + `audit-variant-prop-coverage.mjs`).
 *
 * Surfaces in-editor red squiggles for the highest-impact raw HTML patterns
 * so consumers see violations as they type, instead of only at `npm run check`
 * time. Severity is `"warn"` for now so the IDE flags but doesn't block;
 * the runtime audits are the authoritative gate.
 *
 * The selectors deliberately mirror the file-level audits — drift between
 * the two would defeat the in-editor / audit alignment promise.
 */
const VARIANT_CATALOGUE_RULES = [
  {
    // Hardcoded route strings — use ROUTES.* constants.
    selector: "Literal[value=/^\\/[a-z]+(\\?|#|$)/]",
    message:
      "Use ROUTES.* constants from @mohasinac/appkit instead of hardcoded route strings.",
  },
  {
    // Raw <div className=…> — use <Div>/<Stack>/<Row>/<Container>/<Section>.
    selector:
      "JSXOpeningElement[name.name='div'] > JSXAttribute[name.name='className']",
    message:
      "Variant catalogue: raw <div className=…> bypasses the primitive surface. Use <Div surface=… padding=…>, <Stack>, <Row>, <Container>, or <Section> from @mohasinac/appkit.",
  },
  {
    // Raw <span className=…> — use <Span color=… size=… weight=…>.
    selector:
      "JSXOpeningElement[name.name='span'] > JSXAttribute[name.name='className']",
    message:
      "Variant catalogue: raw <span className=…> bypasses Typography. Use <Span color=… size=… weight=…> from @mohasinac/appkit.",
  },
  {
    // Raw <button>.
    selector: "JSXOpeningElement[name.name='button']",
    message:
      "Variant catalogue: raw <button> bypasses the action registry. Use <Button variant=…> / <IconButton> from @mohasinac/appkit, or <Toggle> for switch UIs.",
  },
  {
    // Raw <a>.
    selector: "JSXOpeningElement[name.name='a']",
    message:
      "Variant catalogue: raw <a> bypasses internal-route + external-URL handling. Use <TextLink> for internal Next.js routes or <Anchor> for external/mailto/tel.",
  },
  {
    // Raw <img>.
    selector: "JSXOpeningElement[name.name='img']",
    message:
      "Variant catalogue: raw <img> bypasses the watermark proxy. Use <MediaImage src=… alt=… size=…> from @mohasinac/appkit.",
  },
  {
    // Raw <input>, <textarea>, <select>, <form>.
    selector:
      "JSXOpeningElement[name.name=/^(input|textarea|select|form)$/]",
    message:
      "Variant catalogue: raw <input>/<textarea>/<select>/<form> bypasses the form primitives. Use <Form>, <FieldInput>, <FieldTextarea>, <FieldSelect> from @mohasinac/appkit.",
  },
];

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
        "no-restricted-syntax": ["warn", ...VARIANT_CATALOGUE_RULES],
        ...override.rules,
      },
    },
  ];
}
