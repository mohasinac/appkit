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

## Current Counts (post all phases)

| Tag             | Count    | Change from baseline |
| --------------- | -------- | -------------------- |
| `[TYPE]`        | 1211     | —                    |
| `[CLIENT-SSR]`  | 987      | +128 (from CLIENT-ONLY) |
| `[SERVER-ONLY]` | 417      | +4 (from DB)         |
| `[UTIL]`        | 191      | +2 (from DB)         |
| `[SCHEMA]`      | 146      | —                    |
| `[DB]`          | 86       | −7 (reclassified)    |
| `[CONFIG]`      | 55       | +1 (from DB)         |
| `[CLIENT-ONLY]` | 31       | −128 from phases     |
| **Total**       | **3124** |                      |

The `[CLIENT-ONLY]` count dropped from 945 (original) → 159 (Phase 0 retag) → **31** (all phases done).

The 31 remaining are the true irreducible set — all confirmed via source-code audit:
- **DOM portal components:** `Modal`, `Drawer`, `SideDrawer`, `SideModal`, `FilterDrawer`, `ConfirmDeleteModal`, `UnsavedChangesModal`, `BottomSheet`, `EventFormDrawer`, `ImageCropModal`, `VideoTrimModal`
- **Browser API hooks:** `useAuth` (window.open, localStorage), `useTheme` (localStorage, matchMedia), `useToast` (window.setTimeout), `useCamera` (navigator.mediaDevices), `useClickOutside` (document), `useContainerGrid` (ResizeObserver), `useGesture`, `useKeyPress`, `useMediaQuery` (matchMedia), `usePullToRefresh`, `useSwipe`, `useUnsavedChanges` (window.beforeunload), `useVisibleItems` (ResizeObserver)
- **Media hooks:** `useMediaUpload`, `useMediaCrop`, `useMediaTrim`, `useMediaAbort`, `useMediaCleanup` (FileReader, Canvas, URL.createObjectURL)
- **Firebase browser SDK:** `FirebaseClientAuthProvider`, `FirebaseClientRealtimeProvider`

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

## Phase 2 — DB Reclassification ✓ (complete)

Audit of `./providers/db-firebase/index` found pure utility functions and a config
constant misclassified as `[DB]`. Reclassified:

- `RTDB_PATHS` → `[CONFIG]`
- `deserializeTimestamps`, `removeUndefined` → `[UTIL]` (pure object transforms)
- `applySieveToFirestore`, `buildFirebaseClientConfig`, `normalizeFirebaseConfigValue`,
  `prepareForFirestore` → `[SERVER-ONLY]` (Firestore-coupled, no admin class)

All concrete repository classes remain `[DB]`. No I*Repository interfaces were found in
the DB export set — they are already in `[TYPE]` via `./contracts/index`.

---

## Phase 3 — Utility Audit ✓ (complete, no-op)

Audit confirmed `./utils/index`, `./monitoring/index`, and `./errors/index` are already
entirely tagged `[UTIL]`. No `[CLIENT-SSR]` exports from utility paths were found.
No code change needed.

---

## Phase 4 — Client Hook Audit ✓ (complete)

Every `[CLIENT-ONLY]` hook was audited by grepping its source file for browser-only
APIs (`window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `matchMedia`,
`IntersectionObserver`, `ResizeObserver`, `addEventListener`).

**Result:** 128 hooks reclassified `[CLIENT-ONLY]` → `[CLIENT-SSR]`.

Hooks confirmed to use browser APIs and kept `[CLIENT-ONLY]`:
- `useAuth` — `window.open`, `localStorage`
- `useTheme` — `localStorage`, `document.cookie`, `matchMedia`
- `useToast` — `window.setTimeout`
- `useCamera` — `navigator.mediaDevices`
- `useClickOutside`, `useKeyPress` — `document` event listener
- `useContainerGrid`, `useVisibleItems` — `ResizeObserver`
- `useGesture`, `usePullToRefresh`, `useSwipe` — touch `addEventListener`
- `useMediaQuery` — `window.matchMedia`
- `useUnsavedChanges` — `window.beforeunload`
- `useMediaUpload/Crop/Trim/Abort/Cleanup` — `FileReader`, `Canvas`, `URL.createObjectURL`

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

| Phase             | Work type                   | Status | Exports reclassified                         |
| ----------------- | --------------------------- | ------ | -------------------------------------------- |
| 0 — Retag ✓       | Tag normalization           | ✓ Done | ~786 correctly classified                    |
| 2 — DB audit ✓    | Source audit + retag        | ✓ Done | 7 DB → CONFIG / UTIL / SERVER-ONLY           |
| 3 — Util audit ✓  | Source audit                | ✓ Done | 0 (utils already clean)                      |
| 4 — Hook audit ✓  | Per-hook source audit       | ✓ Done | 128 CLIENT-ONLY → CLIENT-SSR                 |

## Target State (after all phases)

| Tag             | Current | Target |
| --------------- | ------- | ------ |
| Tag             | Target | Actual |
| --------------- | ------ | ------ |
| `[TYPE]`        | ~1235  | 1211   |
| `[CLIENT-SSR]`  | ~900   | 987    |
| `[SERVER-ONLY]` | ~413   | 417    |
| `[UTIL]`        | ~220   | 191    |
| `[CLIENT-ONLY]` | ~100   | **31** |
| `[SCHEMA]`      | ~146   | 146    |
| `[DB]`          | ~70    | 86     |
| `[CONFIG]`      | ~54    | 55     |

All phases complete. `[CLIENT-ONLY]` target was ~100; actual result is **31** — well
beyond target. The 31 are the verified-irreducible set (see Current Counts above).
