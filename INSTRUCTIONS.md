# Appki/Appkit Instructions

This document defines the working rules for maintainers and contributors of `@mohasinac/appkit`.

## Purpose

Appkit is a shared package used by application consumers for contracts, feature logic, utilities, and integration layers. Changes should preserve compatibility, clear runtime boundaries, and stable exports.

## Project Structure Guidance

Follow the existing `src/` domain layout:

- `contracts/`: shared types and interfaces
- `constants/`: static endpoints/config values
- `core/`: framework-agnostic service classes and cross-cutting logic
- `features/`: feature modules (UI, hooks, services, schemas)
- `providers/` and `repositories/`: integration and persistence layers
- `errors/`, `utils/`, `validation/`, `tokens/`, `style/`: shared foundational modules

## Runtime Boundary Rules

Treat runtime targeting as a hard requirement:

1. Browser-only code stays isolated to client-only modules.
2. Server-only integrations stay isolated to server execution contexts.
3. Universal helpers must not import browser globals or server SDKs.
4. Avoid mixed barrels that combine browser-only and universal/server exports.

## Public API Rules

1. All public exports must be intentional.
2. Add new public symbols through local `index.ts` files and then `src/index.ts`.
3. Avoid leaking internal file paths into consumer code.
4. Prefer additive changes; avoid breaking rename/removal without migration notes.

## How Consumers Should Handle Appkit

Consumers are expected to:

1. Import from `@mohasinac/appkit` package root.
2. Keep server secrets and privileged SDK usage in server contexts only.
3. Use dynamic imports with `ssr: false` when loading browser-only components inside SSR routes.
4. Keep route data loading and mutation orchestration in the app layer.
5. Pass prepared data into appkit modules instead of mixing infrastructure logic in UI code.

## Adding New Components or Code

When adding new code, use this process:

1. Choose the right module location based on responsibility.
2. Keep each component small and focused; split hooks/services if responsibilities diverge.
3. Define types first in `contracts/` or colocated `types` modules.
4. Add validation schemas for external input where applicable.
5. Export through barrels in a controlled way.
6. Update docs (`README.md` and this file) if behavior or usage changes.

For UI components specifically:

1. Keep props explicit and typed.
2. Avoid implicit environment assumptions (do not access browser APIs unless the module is client-only).
3. Keep styling and state logic maintainable and testable.

## Quality Gates

Before merging or publishing:

1. Run `npm run build`.
2. Resolve all TypeScript errors.
3. Confirm new exports compile and are included in package output.
4. Confirm no accidental runtime boundary regressions.
5. Ensure docs remain accurate for consumers.

## Release Hygiene

1. Verify `package.json` metadata and version.
2. Verify `dist/` reflects latest source.
3. Keep changelog/release notes aligned with API changes.
