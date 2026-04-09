# `@mohasinac/appkit/tokens`

Design system constants for Tailwind CSS — responsive grids, colour tokens, spacing, typography scale, skeleton animations, and locale defaults.

## Key exports

| Export | Description |
|---|---|
| `THEME_CONSTANTS` | Full design system map (grid, card, flex, input, skeleton, motion, etc.) |
| `COLORS` | Brand palette (`primary` #84e122, `secondary` #e91e8c, `cobalt` #3570fc) |
| `RADIUS` | Border-radius tokens |
| `SHADOWS` | Box-shadow tokens |
| `Z_INDEX` | Z-index scale |
| `FLUID_GRID_MIN_WIDTHS` | Min widths for `useContainerGrid` |
| `LOCALE_CONFIG` | INR / en-IN / Asia/Kolkata defaults, supported currencies |
| `token(name)` | Returns `var(--lir-{name})` CSS custom property reference |
| `TOKENS` | Convenience group: colors + radius + shadows + zIndex |

## LOCALE_CONFIG

```ts
import { LOCALE_CONFIG } from "@mohasinac/appkit/tokens";

LOCALE_CONFIG.defaultCurrency  // "INR"
LOCALE_CONFIG.defaultLocale    // "en-IN"
LOCALE_CONFIG.currencySymbols  // { INR: "₹", USD: "$", ... }
```

## Skeleton shimmer

Add to `tailwind.config.js` to enable the `shimmer` variant of `THEME_CONSTANTS.skeleton`:

```js
// tailwind.config.js
theme: {
  extend: {
    animation: { shimmer: "shimmer 1.5s infinite" },
    keyframes: {
      shimmer: {
        "0%":   { backgroundPosition: "-400% 0" },
        "100%": { backgroundPosition: "400% 0" },
      },
    },
  },
}
```

Then use `THEME_CONSTANTS.skeleton.shimmer` / `.shimmerCard` etc. on skeleton elements.
