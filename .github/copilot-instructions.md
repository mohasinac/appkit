# Copilot Instructions — appkit (`@mohasinac/appkit`)

## Purpose
`appkit` is the **single source of truth** for all reusable code across `letitrip.in`, `licorice`, and `hobson`. Every generic UI primitive, layout, hook, context, utility, provider, and feature view lives here. Consumer projects contain only app-specific thin wrappers or configuration.

---

## Architecture Tiers

| Tier | Location | Contains |
|------|----------|----------|
| **0 — Tokens** | `src/tokens/`, `src/style/` | Design tokens, Tailwind config, CSS vars, animation/color helpers |
| **1 — UI Atoms** | `src/ui/components/` | Stateless HTML-wrapper primitives: `Button`, `Div`, `Section`, `Typography`, `Layout`, etc. No data fetching. No `useEffect`. |
| **2 — Feature Components** | `src/features/*/components/` | Composed views that use Tier-1 atoms + hooks. Default to `async` Server Components. |
| **3 — Page Views** | `src/features/*/components/*View.tsx` | Full-screen view compositions. Must be `async` Server Components — accept only serialisable props. |

---

## Core Rules

### 1. Appkit-first — No Duplication Across Consumers
- If code is reusable across ≥ 2 consumer apps → it **must** live in appkit.
- If the same concept exists with different variants in two repos → **merge into one configurable file** in appkit, delete both originals.
- Consumer repos (`letitrip.in`) may only contain: Next.js `app/` routes, server actions, project-specific `providers.config.ts`, `features.config.ts`, and single-purpose adapters that call appkit APIs.

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

---

## File Conventions

| Pattern | Rule |
|---------|------|
| `*View.tsx` | Full-page view — must be `async` Server Component |
| `*Form.tsx` | Form component — may be `'use client'` |
| `*Drawer.tsx` | Sliding panel — may be `'use client'` |
| `*Modal.tsx` | Dialog — may be `'use client'` |
| `use*.ts` | Client hook — always `'use client'` |
| `*.repository.ts` | Repository class — never `'use client'` |
| `*.schema.ts` | Firestore constants — never `'use client'` |
| `*.factory.ts` | Seed factory — never `'use client'` |

---

## Import Order
```ts
// 1. React / Next
import React from 'react';
import { cookies } from 'next/headers';
// 2. Appkit
import { Container, Stack } from '@mohasinac/appkit/ui';
import { BlogRepository } from '@mohasinac/appkit/features/blog';
// 3. Local (letitrip-specific)
import { SiteConfig } from '@/config/site';
```

---

## What NOT to Add to Appkit
- letitrip-specific business rules (country/currency hard-coded to India/INR, listing auction/pre-order logic specific to this marketplace)
- Firebase project credentials or `.env` values
- Next.js `app/` route pages — those always stay in the consumer app
