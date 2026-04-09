# @mohasinac/appkit

> **All-in-one application toolkit** — consolidates all `@mohasinac/*` packages into a single, well-structured package with sub-path exports.

## Installation

```bash
npm install @mohasinac/appkit
```

## Sub-path exports

| Import path | Contents |
|---|---|
| `@mohasinac/appkit/contracts` | Interfaces, ProviderRegistry, SieveQuery |
| `@mohasinac/appkit/core` | Logger, Queue, CacheManager, EventBus, StorageManager |
| `@mohasinac/appkit/http` | ApiClient, apiClient singleton |
| `@mohasinac/appkit/errors` | AppError, ApiError, NotFoundError, handleApiError |
| `@mohasinac/appkit/utils` | formatCurrency, formatDate, formatNumber |
| `@mohasinac/appkit/validation` | Zod schemas, emailSchema, passwordSchema |
| `@mohasinac/appkit/tokens` | COLORS, SPACING, BREAKPOINTS design tokens |
| `@mohasinac/appkit/next` | createApiErrorHandler, createApiHandler, IAuthVerifier |
| `@mohasinac/appkit/react` | useMediaQuery, useBreakpoint, useClickOutside, useUrlTable |
| `@mohasinac/appkit/ui` | Section, Heading, Text, Button, Badge, Spinner, DataTable |
| `@mohasinac/appkit/security` | requireAuth, requireRole, rateLimit, buildCSP, RBAC utilities |
| `@mohasinac/appkit/seo` | generateMetadata helpers, JSON-LD schemas |
| `@mohasinac/appkit/monitoring` | trackError, getCacheMetrics, setErrorTracker |
| `@mohasinac/appkit/instrumentation` | OpenTelemetry bootstrap |
| `@mohasinac/appkit/style/tailwind` | tailwindStyleAdapter (cn, token) |
| `@mohasinac/appkit/style/vanilla` | vanillaStyleAdapter |
| `@mohasinac/appkit/providers/db-firebase` | FirebaseRepository, firebaseDbProvider |
| `@mohasinac/appkit/providers/auth-firebase` | FirebaseAuthProvider |
| `@mohasinac/appkit/providers/email-resend` | ResendEmailProvider |
| `@mohasinac/appkit/providers/storage-firebase` | FirebaseStorageProvider |
| `@mohasinac/appkit/providers/payment-razorpay` | RazorpayProvider |
| `@mohasinac/appkit/providers/search-algolia` | algoliaSearch, indexHelpers |
| `@mohasinac/appkit/providers/shipping-shiprocket` | ShiprocketProvider |
| `@mohasinac/appkit/features/*` | Domain feature views, hooks, actions, types |
| `@mohasinac/appkit/cli` | withFeatures(), mergeFeatureMessages() |

## Quick start

```ts
// providers.config.ts
import { registerProviders } from "@mohasinac/appkit/contracts";
import { firebaseDbProvider } from "@mohasinac/appkit/providers/db-firebase";
import { FirebaseAuthProvider } from "@mohasinac/appkit/providers/auth-firebase";
import { ResendEmailProvider } from "@mohasinac/appkit/providers/email-resend";
import { tailwindStyleAdapter } from "@mohasinac/appkit/style/tailwind";

registerProviders({
  db: firebaseDbProvider,
  auth: new FirebaseAuthProvider(),
  email: new ResendEmailProvider(process.env.RESEND_API_KEY!),
  style: tailwindStyleAdapter,
});
```

## Migrating from separate packages

Replace individual `@mohasinac/*` imports with `@mohasinac/appkit/*` sub-paths:

```ts
// Before
import { getProviders } from "@mohasinac/contracts";
import { apiClient } from "@mohasinac/http";
import { Button } from "@mohasinac/ui";
import { requireAuth } from "@mohasinac/security";

// After
import { getProviders } from "@mohasinac/appkit/contracts";
import { apiClient } from "@mohasinac/appkit/http";
import { Button } from "@mohasinac/appkit/ui";
import { requireAuth } from "@mohasinac/appkit/security";
```

## Package info

- **Version**: 2.0.0
- **Replaces**: 58 separate `@mohasinac/*` packages
- **Build**: `tsup` with code splitting + tree-shaking
- **Target**: ES2017, ESM + CJS dual output
