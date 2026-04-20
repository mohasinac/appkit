# Isomorphic Rework Plan

Goal: reduce the `[CLIENT-ONLY]` export count and eliminate misclassification so every
export in `src/index.ts` carries the most permissive correct tag.

## Tag System

| Tag             | Meaning                                                                                                   | Can SSR?   | Can run in browser? |
| --------------- | --------------------------------------------------------------------------------------------------------- | ---------- | ------------------- |
| `[CLIENT-ONLY]` | Uses browser-only APIs (`window`, `navigator`, `localStorage`, `matchMedia`, DOM events). **Cannot SSR.** | ✗          | ✓                   |
| `[CLIENT-SSR]`  | React component or hook with no browser-only dependency. Works in Next.js SSR and in the browser.         | ✓          | ✓                   |
| `[SERVER-ONLY]` | Uses Node.js, Next.js server internals, or server-side SDKs (auth, email, payment, shipping).             | ✓ (server) | ✗                   |
| `[DB]`          | Database layer — firebase-admin / Firestore repository classes. Server environment only.                  | ✓ (server) | ✗                   |
| `[UTIL]`        | Pure utility function — no framework or runtime dependency. Safe anywhere.                                | ✓          | ✓                   |
| `[TYPE]`        | TypeScript type-only export — erased at compile time, zero runtime cost.                                  | ✓          | ✓                   |
| `[SCHEMA]`      | Zod validator, default-value object, or Firestore collection/field name constant.                         | ✓          | ✓                   |
| `[CONFIG]`      | Route path, API endpoint, design token, or feature flag constant.                                         | ✓          | ✓                   |

## Current Counts (post Phase-0 retag)

| Tag             | Count    |
| --------------- | -------- |
| `[TYPE]`        | 1211     |
| `[CLIENT-SSR]`  | 859      |
| `[SERVER-ONLY]` | 413      |
| `[UTIL]`        | 189      |
| `[CLIENT-ONLY]` | 159      |
| `[SCHEMA]`      | 146      |
| `[DB]`          | 93       |
| `[CONFIG]`      | 54       |
| **Total**       | **3124** |

The `[CLIENT-ONLY]` count dropped from 945 → 159 through correct classification alone.
The 159 remaining are the irreducible set: Modals, Drawers, Forms, Sheets, Sidebars, and
client hooks that genuinely use browser APIs.

---

## Root Causes

There are four distinct reasons something ends up CLIENT-ONLY or SERVER-ONLY today:

1. **Barrel contamination** — a module barrel (`*/index`) mixes pure types/constants with components or SDK calls, so the whole barrel gets the highest-restriction tag.
2. **Misclassification** — async React Server Components were tagged CLIENT-ONLY; they are now `[CLIENT-SSR]` (SSR-capable).
3. **Concrete-implementation coupling** — repository interfaces were co-exported with firebase-admin classes; repositories are now `[DB]`, interfaces stay `[TYPE]`.
4. **SDK boundary not abstracted** — the Firebase client SDK provider is `[CLIENT-ONLY]`. Consumers wrap `[CLIENT-ONLY]` imports with `next/dynamic({ ssr: false })` as needed; appkit provides one single barrel and does not split per runtime.

---

## Phase 1 — Schema/Types Extraction ✓ (complete via retag)

Schema constants (`DEFAULT_*`, `*_FIELDS`, `*_COLLECTION`) are already tagged `[SCHEMA]`.
No code change needed — the retag script fixed the classification.

Previously mislabelled paths (now `[SCHEMA]`):

- `./features/auth/schemas/index`
- `./features/cart/schemas/index`
- `./features/checkout/schemas/index`
- `./features/homepage/schemas/index`

---

## Phase 2 — Repository / Interface Separation

**Problem:** `./repositories/index` is `[DB]` which is correct for concrete classes. However
`IRepository<T>`, `IProductRepository`, etc. are pure TypeScript interfaces that should be `[TYPE]`.

**Action:**

1. Audit `./contracts/index` — confirm it contains only interfaces/types. Re-tag all `./contracts/` exports `[TYPE]` if not already.
2. For each `I*Repository` interface currently exported from `./repositories/index`, move or co-export from `./contracts/index` so it gets `[TYPE]`.
3. Concrete repository classes remain `[DB]`.

**Expected gain:** ~20–30 exports reclassified `[DB]` → `[TYPE]`.

---

## Phase 3 — Utility Audit

**Problem:** Some utilities may still appear under `./ui/index` or `./react/index` and therefore carry `[CLIENT-SSR]` when they could be `[UTIL]`.

**Action:**

1. For every pure formatter/helper (`formatPrice`, `formatDate`, `slugify`, etc.) that currently lives inside `./ui/index`, move it to `./utils/` and re-export from there.
2. Any function with zero React/browser/Node dependency gets tagged `[UTIL]`.

**Expected gain:** ~20–40 exports reclassified `[CLIENT-SSR]` → `[UTIL]`.

---

## Phase 4 — Client Hook Audit (Reduce CLIENT-ONLY Further)

**Problem:** Not every `use[A-Z]*` hook actually uses browser APIs. Some are pure state machines or data-transformation hooks that are fine in SSR.

**Action per hook:**

1. Grep each hook body for `window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `matchMedia`, `IntersectionObserver`, `ResizeObserver`.
2. If none found → retag `[CLIENT-SSR]`.
3. If found → keep `[CLIENT-ONLY]` and note the specific API.

**Candidate hooks to audit first:**

- `useCart`, `useOrders`, `useProfile`, `useWishlist`, `useSearch`
- `useFilters`, `useProductList`, `useBidding`

**Expected gain:** ~30–50 exports reclassified `[CLIENT-ONLY]` → `[CLIENT-SSR]`.

---

## Consumer-Side Responsibilities

Some concerns cannot be made SSR-capable in appkit. These stay with the consumer:

| Concern                                 | Consumer action                                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route-specific data fetching            | `fetch` / `cache()` in the Next.js page; pass data as props to appkit views                                                                                  |
| `[CLIENT-ONLY]` components in SSR pages | Wrap with `next/dynamic(() => import('@mohasinac/appkit'), { ssr: false })` at the call site — appkit provides one barrel, consumer chooses when to skip SSR |
| Environment secrets                     | `.env.local` + `providers.config.ts` — never imported in client code                                                                                         |
| SDK initialisation                      | `initializeApp()` once in `providers.config.ts`                                                                                                              |
| Server action registration              | Thin `'use server'` wrapper around appkit repository methods in `src/actions/`                                                                               |

---

## Phased Execution Summary

| Phase                    | Work type                   | Effort | Exports reclassified         |
| ------------------------ | --------------------------- | ------ | ---------------------------- |
| 0 — Retag ✓              | Tag normalization           | Done   | ~786 correctly classified    |
| 2 — Interface separation | Code refactor + retag       | Low    | ~25 DB → TYPE                |
| 3 — Utility audit        | Retag / minor moves         | Low    | ~30 CLIENT-SSR → UTIL        |
| 4 — Hook audit           | Per-hook code audit + retag | Medium | ~40 CLIENT-ONLY → CLIENT-SSR |

## Target State (after all phases)

| Tag             | Current | Target |
| --------------- | ------- | ------ |
| `[TYPE]`        | 1211    | ~1235  |
| `[CLIENT-SSR]`  | 859     | ~900   |
| `[SERVER-ONLY]` | 413     | ~413   |
| `[UTIL]`        | 189     | ~220   |
| `[CLIENT-ONLY]` | 159     | ~100   |
| `[SCHEMA]`      | 146     | ~146   |
| `[DB]`          | 93      | ~70    |
| `[CONFIG]`      | 54      | ~54    |

The irreducible `[CLIENT-ONLY]` core (~100) is: `Modal`, `Drawer`, `Sheet`, `SideDrawer`,
`SideModal`, dialog primitives, the Firebase client SDK provider wrapper, and any hook
that directly calls a browser-only API. Consumers use `next/dynamic({ ssr: false })` at
the call site when they need to render these in an SSR page — no appkit split required.
