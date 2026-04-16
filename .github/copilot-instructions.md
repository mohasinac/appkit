# Copilot Instructions — appkit (`@mohasinac/appkit`)

## Purpose

`appkit` is the **single source of truth** for all reusable code across `letitrip.in`, `licorice`, and `hobson`. Every generic UI primitive, layout, hook, context, utility, provider, and feature view lives here. Consumer projects contain only app-specific thin wrappers or configuration.

---

## Architecture Tiers

| Tier                       | Location                              | Contains                                                                                                                      |
| -------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **0 — Tokens**             | `src/tokens/`, `src/style/`           | Design tokens, Tailwind config, CSS vars, animation/color helpers                                                             |
| **1 — UI Atoms**           | `src/ui/components/`                  | Stateless HTML-wrapper primitives: `Button`, `Div`, `Section`, `Typography`, `Layout`, etc. No data fetching. No `useEffect`. |
| **2 — Feature Components** | `src/features/*/components/`          | Composed views that use Tier-1 atoms + hooks. Default to `async` Server Components.                                           |
| **3 — Page Views**         | `src/features/*/components/*View.tsx` | Full-screen view compositions. Must be `async` Server Components — accept only serialisable props.                            |

---

## Core Rules

### 1. Appkit-first — No Duplication Across Consumers

- If code is reusable across ≥ 2 consumer apps → it **must** live in appkit.
- If the same concept exists with different variants in two repos → **merge into one configurable file** in appkit, delete both originals.
- Consumer repos (`letitrip.in`) may only contain: Next.js `app/` routes, server actions, project-specific `providers.config.ts`, `features.config.ts`, and single-purpose adapters that call appkit APIs.
- While consumer repos are still evolving, temporary divergence is not a reason to keep duplicate implementations outside appkit; fold the differences back into appkit quickly.

### 2. SSR by Default — Avoid `'use client'`

- All components default to **React Server Components** (RSC).
- `'use client'` is **only** permitted for:
  - Tier-1 HTML-wrapper building blocks that need event handlers (`onClick`, `onChange`, `onSubmit`, …)
  - Components that require browser APIs (`window`, `localStorage`, `IntersectionObserver`, …)
  - Controlled form inputs and interactive UI atoms
- **Never** add `'use client'` to page views, feature views, layouts, or data-fetching wrappers.
- Prefer passing server-fetched data as props over client-side `useEffect` + fetch.
- Use `cookies()`, `headers()`, `cache()`, and `fetch` with `{ next: { revalidate } }` directly in Server Components.

### 3. HTML Wrappers — Use Appkit Semantics, Not Raw Tags

- **Never** use raw `<div>`, `<section>`, `<article>`, `<main>`, `<aside>`, `<nav>`, `<ul>`, `<ol>`, `<li>`, `<header>`, `<footer>`, `<span>`, `<p>`, `<h1>`–`<h6>` directly.
- Always import from `@mohasinac/appkit/ui`:
  - `<Div>`, `<Section>`, `<Article>`, `<Main>`, `<Aside>`, `<Nav>`, `<Header>`, `<Footer>`, `<Span>`
  - `<Ul>`, `<Ol>`, `<Li>`
  - `<Heading level={2}>`, `<Text>`, `<Label>`, `<Caption>`
  - `<Container size="2xl">`, `<Stack gap="md">`, `<Row justify="between">`, `<Grid cols={3}>`
- Wrappers carry **named variant props** (not raw `className`) for the most common styles. Pass `className` only for one-off overrides.

### 4. HTML Wrapper Variant Props — Add Config, Not Classes

When a pattern (e.g. `flex items-center gap-2`) appears in ≥ 3 places → add it as a **named variant** to the wrapper component instead of passing the class string each time.

```tsx
// ✗ Bad — raw class strings repeated everywhere
<div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">

// ✓ Good — named variant
<SummaryCard variant="outlined">

// ✗ Bad — layout classes inline
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// ✓ Good — Grid primitive with token props
<Grid cols={3} gap="md">
```

- When expanding variants, mine repeated wrapper usage across consumers before adding API surface. A new variant/config prop should correspond to a verified repeated semantic pattern, not a one-off styling preference.
- Every new wrapper variant must preserve or improve accessibility: semantic landmark choice, heading order, focus visibility, interaction affordances, and color contrast must remain correct by default.
- Once a variant is approved and added, adoption is mandatory across appkit and consumer repos for matching repeated patterns. Replace large repeated className bundles with the variant; do not leave parallel class-string implementations except documented one-off exceptions.

### 5. Merge Duplicates With Config

If two files serve the same logical purpose but differ in data shape or presentation:

```tsx
// ✗ Bad — two separate files
// BlogFilters.tsx  (filters for blog)
// EventFilters.tsx (filters for events)

// ✓ Good — one configurable component
// EntityFilters.tsx with `entity="blog" | "event" | "product"` prop
```

The appkit component reads feature-level config from the prop; letitrip passes the prop — no logic duplication.

When migrating a reusable concern from letitrip into appkit, keep letitrip behavior as the initial default baseline in appkit.
That default must never be a dead-end: expose typed extension points so consumers can override either the whole behavior or only specific parts (for example via config objects, callbacks, adapters, render functions, or provider bindings).

If the same basename appears in both a consumer index and `appkit/index.md`, treat that as a high-confidence dedupe candidate and resolve ownership explicitly.
Default resolution: appkit owns the reusable implementation, and the consumer is reduced to direct imports or minimal config-only wiring.

### 6. Hooks & Contexts — All in Appkit

- All hooks live in `src/react/hooks/` or the relevant `src/features/*/hooks/` directory.
- All React contexts live in `src/react/contexts/` or `src/features/*/contexts/`.
- Consumer apps never define hooks or contexts — they import from appkit.

### 7. Repository Pattern

- All repository classes extend the base `FirebaseRepository<T>` or implement `IRepository<T>`.
- No module-level singletons in consumer apps. Register instances via `ProviderRegistry`.
- Schema constants (`COLLECTION`, `FIELD`, default shapes) live in `src/features/*/schema/`.

### 8. Provider / Adapter Pattern

- All third-party integrations (auth, DB, email, payment, shipping, storage, search) are abstracted behind an interface in `src/contracts/`.
- Concrete implementations live in `src/providers/`.
- Consumer apps register a provider in `providers.config.ts` — they never call the SDK directly.

Locale, currency, and market-specific formatting config follow the same rule: appkit owns the reusable formatter/component, while the consumer injects market config.

### 9. No Re-exports — Direct Imports Only

- **Never** create a file whose sole purpose is to re-export from another module.
- If a letitrip file does nothing but `export { X } from '@mohasinac/appkit/...'` → **delete it** and update every import site to point directly to appkit.
- If an appkit file re-exports from another appkit internal → collapse into the source file or the correct barrel `index.ts`.
- The only permitted barrel files are the official entrypoint `index.ts` files declared in `tsup.config.ts`.

```ts
// ✗ Bad — letitrip shim re-exporting appkit
// src/lib/monitoring/performance.ts
export { trackPerformance } from "@mohasinac/appkit/monitoring";

// ✓ Good — every consumer imports directly
import { trackPerformance } from "@mohasinac/appkit/monitoring";
```

**When deleting a re-export file:**

1. Run a codebase-wide find for the shim's import path.
2. Replace each occurrence with the canonical appkit import.
3. Delete the shim file.
4. Verify no remaining references with `grep -r` before committing.

---

## File Conventions

| Pattern           | Rule                                              |
| ----------------- | ------------------------------------------------- |
| `*View.tsx`       | Full-page view — must be `async` Server Component |
| `*Form.tsx`       | Form component — may be `'use client'`            |
| `*Drawer.tsx`     | Sliding panel — may be `'use client'`             |
| `*Modal.tsx`      | Dialog — may be `'use client'`                    |
| `use*.ts`         | Client hook — always `'use client'`               |
| `*.repository.ts` | Repository class — never `'use client'`           |
| `*.schema.ts`     | Firestore constants — never `'use client'`        |
| `*.factory.ts`    | Seed factory — never `'use client'`               |

---

## Import Order

```ts
// 1. React / Next
import React from "react";
import { cookies } from "next/headers";
// 2. Appkit
import { Container, Stack } from "@mohasinac/appkit/ui";
import { BlogRepository } from "@mohasinac/appkit/features/blog";
// 3. Local (letitrip-specific)
import { SiteConfig } from "@/config/site";
```

---

### 10. Multi-Media Support in Schemas and Forms

- Any schema field that can hold ≥ 1 image, video, or file uses `MediaField` — a single typed descriptor:
  ```ts
  type MediaField = {
    url: string;
    type: "image" | "video" | "file";
    alt?: string;
  };
  // Single media: MediaField | null
  // Multiple media: MediaField[]
  ```
- Forms that include media uploads use `<MediaUploadField>` (single) or `<MediaUploadList>` (multiple), both from `@mohasinac/appkit/media`.
- **Auto-delete on cancel:** Every `<MediaUploadField>` / `<MediaUploadList>` instance receives an `onAbort` prop. The parent form calls `onAbort()` for every staged-but-unsaved URL when the user dismisses without saving. The implementation calls `DELETE /api/media?url=...` for each staged URL so orphaned files are never left in storage.
- Media upload hooks (`useMediaUpload`, `useMediaCrop`, `useMediaTrim`) live in `appkit/src/features/media/hooks/`. Consumer apps never redefine upload logic.

### 11. Standardised ID Generators

- All ID generation for Firestore documents uses the pre-built generators in `appkit/src/utils/id-generators.ts`.
- Every generator accepts an optional `customId?: string` override — if supplied it is returned as-is (validated as non-empty string), allowing callers to bring their own ID without duplicating the generator.
  ```ts
  export function generateProductId(
    input: GenerateProductIdInput & { customId?: string },
  ): string {
    if (input.customId?.trim()) return input.customId.trim();
    // ... derived slug logic
  }
  ```
- Do not create ad-hoc ID strings (`Date.now()`, `Math.random()`, `uuidv4()`) anywhere in letitrip or in appkit features. Always call the typed generator.
- New entity types get a new generator added to `id-generators.ts` — never inline.

### 12. Auction / Pre-Order / Listing Logic Is Appkit-Configurable

- Auction, pre-order, and listing behaviours (bidding logic, countdown timers, pre-order eligibility windows, offer negotiation flows) are **generic marketplace patterns** and belong in appkit under `src/features/products/` and `src/features/auctions/`.
- letitrip passes configuration (e.g. `listingType="auction" | "pre-order" | "standard"`) — it never duplicates the business logic.
- Hard-coded country/currency values (`INR`, `IN`) **do** remain letitrip-specific and must be injected via `SiteConfig` / `providers.config.ts`, never hard-coded in appkit.

### 13. i18n and Currency APIs Must Be Shared-Ready

- Shared UI and utility code must assume locale-aware rendering and must not hard-code user-facing English copy when the string belongs to a translatable interface.
- Shared money rendering should go through canonical formatters/components such as `src/utils/number.formatter.ts`, `src/ui/components/PriceDisplay.tsx`, or provider-backed payment helpers.
- Appkit may define formatter/component APIs and sensible fallbacks, but market ownership (currency code, country, locale policy) must stay in the consumer config.
- If a consumer reports `$` output in an INR market, first inspect config propagation into appkit before adding local formatting patches.

### 14. Consolidation Bias

- If a consumer implementation differs from appkit but the concept is still reusable, merge the difference into appkit instead of preserving two codepaths.
- “Keep it in the consumer because it is different today” is not an acceptable steady-state architecture decision.
- The only acceptable long-term reasons for code to remain outside appkit are consumer-only routing, server action entrypoints, project configuration, secrets, and deployment/runtime wiring.

### 15. Multi-Session Delivery Discipline

- Assume migration work may continue across many separate Copilot sessions and machines.
- Keep changes scoped so each session can end with a coherent commit and a clear next starting point.
- When working from `prune.md`, treat it as the authoritative backlog and update it as part of the workflow, not as an afterthought.
- If watcher/build output is available, use it continuously during the session and mention its latest state in the handoff summary.
- Prefer incremental, appkit-owned migration steps that can be resumed independently instead of large cross-repo unfinished rewrites.
- Multiple related migration tasks may be completed in the same session when they serve one appkit-owned delivery unit, share validation signals, and still produce a coherent commit.
- Do not batch unrelated cleanup just to increase throughput; batching is for tightly coupled migration steps only.
- After each meaningful change batch, update `prune.md` or the active migration tracker so status stays current while work is in progress.
- After each commit, refresh the tracker status to reflect the exact committed state rather than pending local edits.

---

## File Conventions

| Pattern           | Rule                                              |
| ----------------- | ------------------------------------------------- |
| `*View.tsx`       | Full-page view — must be `async` Server Component |
| `*Form.tsx`       | Form component — may be `'use client'`            |
| `*Drawer.tsx`     | Sliding panel — may be `'use client'`             |
| `*Modal.tsx`      | Dialog — may be `'use client'`                    |
| `use*.ts`         | Client hook — always `'use client'`               |
| `*.repository.ts` | Repository class — never `'use client'`           |
| `*.schema.ts`     | Firestore constants — never `'use client'`        |
| `*.factory.ts`    | Seed factory — never `'use client'`               |

---

## Import Order

```ts
// 1. React / Next
import React from "react";
import { cookies } from "next/headers";
// 2. Appkit
import { Container, Stack } from "@mohasinac/appkit/ui";
import { BlogRepository } from "@mohasinac/appkit/features/blog";
// 3. Local (letitrip-specific)
import { SiteConfig } from "@/config/site";
```

---

## What NOT to Add to Appkit

- Hard-coded country/currency values (`INR`, `IN`, phone code `+91`) — inject via `SiteConfig`
- Firebase project credentials or `.env` values
- Next.js `app/` route pages — those always stay in the consumer app
