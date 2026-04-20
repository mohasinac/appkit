# @mohasinac/appkit

Appkit is a TypeScript package that provides shared contracts, feature modules, UI helpers, repositories, and runtime-aware utilities for Next.js and React applications.

## Package Info

- Name: `@mohasinac/appkit`
- Current version: `2.3.1`
- Module type: ESM
- Entrypoints:
  - Root: `dist/index.js`
  - Client-only: `dist/client.js`
  - Server-only: `dist/server.js`

## Installation

```bash
npm install @mohasinac/appkit
```

Install peer dependencies required by the features you use:

```bash
npm install react react-dom next next-intl @tanstack/react-query
```

Optional peer dependencies (only if your integration uses them):

- `firebase-admin`
- `resend`
- `razorpay`

## Build Appkit Locally

```bash
npm run build
```

This compiles the package to `dist/` using `tsconfig.build.json`.

## Basic Consumer Usage

```ts
import {
  // contracts
  type ApiResponse,
  // constants
  API_ENDPOINTS,
  // utilities
  createApiEndpointResolver,
} from "@mohasinac/appkit";
```

Appkit exposes three runtime-aware entrypoints:

- `@mohasinac/appkit`: shared/runtime-safe exports
- `@mohasinac/appkit/client`: browser-only exports
- `@mohasinac/appkit/server`: server-only exports

Use the smallest runtime-specific entrypoint possible.

## Runtime Handling for Consumers

Because Appkit includes both server-capable and browser-only modules, consumers must choose where code runs.

1. Use shared utilities, types, schemas, and config constants anywhere.
2. Use server-only code only in server contexts (server actions, route handlers, backend code).
3. Render browser-only modules from client components.
4. If a browser-only component must be loaded from an SSR route, use dynamic import with SSR disabled.

Example for browser-only modules in an SSR page:

```tsx
import dynamic from "next/dynamic";

const ClientWidget = dynamic(
  () => import("@mohasinac/appkit/client").then((m) => m.ClientWidget),
  { ssr: false },
);
```

Example for server-only modules:

```ts
import { createApiHandler } from "@mohasinac/appkit/server";
```

## Consumer Responsibilities

When integrating Appkit, keep these boundaries in your application:

1. Keep secrets in server-only environment files and never expose them in client bundles.
2. Initialize SDKs once in provider/config bootstrap code.
3. Keep page-level data fetching in your app's page or server layer; pass data to Appkit views/components.
4. Wrap writes/mutations in server actions or backend handlers.
5. Use Appkit repositories/contracts rather than bypassing with ad hoc direct SDK calls.

## Adding New Components or Code to Appkit

Use this checklist when contributing:

1. Place code in the appropriate domain folder under `src/` (`features/`, `core/`, `contracts/`, `utils/`, etc.).
2. Export new symbols from the local domain barrel (`index.ts`) and then from `src/index.ts` if public.
3. Keep runtime boundaries explicit:
   - Browser API usage (`window`, `document`, `navigator`, `localStorage`) belongs to client-only modules.
   - Node/server SDK usage belongs to server-only modules.
   - Pure helpers stay framework-agnostic.
4. Prefer type-safe contracts and schema validation for new APIs and forms.
5. Run `npm run build` and fix all TypeScript errors before publishing.
6. Add or update docs when new exports change consumer behavior.

## Publishing Notes

- Only `dist/` is published (`files` field in `package.json`).
- Ensure build output is up to date before release.
- Validate exported API surface from `src/index.ts`, `src/client.ts`, and `src/server.ts` before version bump.
