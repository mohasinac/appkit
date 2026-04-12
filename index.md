# appkit Index

Shared source-of-truth package for reusable modules across consumer apps.

## Purpose

appkit owns reusable implementation for:
- contracts and interfaces
- providers/adapters
- core runtime services
- UI primitives and shared feature components/views
- shared utilities, validation, security, and instrumentation

Consumer apps should import from appkit and keep only app-specific wiring.

## Top-Level Module Areas

- contracts: src/contracts/
- providers: src/providers/
- core services: src/core/
- ui primitives: src/ui/
- react helpers: src/react/
- next adapters: src/next/
- shared features: src/features/
- utilities and validation: src/utils/, src/validation/
- tokens and style: src/tokens/, src/style/
- security and monitoring: src/security/, src/monitoring/

## Package Entrypoints

Primary package exports are defined in:
- package.json (exports map)
- tsup.config.ts (build entrypoints)

## Build and Quality

- build: npm run build
- watch: npm run watch
- typecheck: npm run typecheck
- lint: npm run lint

## Important Documents

- package manifest: package.json
- build config: tsup.config.ts
- architecture rules: .github/copilot-instructions.md

## Notes

- This index is intentionally concise and manually maintained.
- For exact symbol locations, use workspace search instead of a giant generated file map.
