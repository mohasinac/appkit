# `@mohasinac/appkit/contracts`

Provider-agnostic interfaces that define the entire data/auth/storage boundary.

## Exports

| Interface/Type           | Purpose                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `IRepository<T>`         | CRUD + paged reads for any domain entity                    |
| `IReadRepository<T>`     | Read-only subset                                            |
| `IWriteRepository<T>`    | Write-only subset                                           |
| `IRealtimeRepository<T>` | `subscribe()` + `subscribeWhere()` for RTDB                 |
| `IDbProvider`            | Factory: `getRepository<T>(collection)`                     |
| `SieveQuery`             | Filter/sort/page descriptor (Sieve-compatible)              |
| `PagedResult<T>`         | `{ data, total, page, perPage }`                            |
| `IAuthProvider`          | `signIn`, `signOut`, `getCurrentUser`, `onAuthStateChanged` |
| `ISessionProvider`       | Cookie-based session (SSR)                                  |
| `IEmailProvider`         | `sendEmail(options)`                                        |
| `IStorageProvider`       | `upload`, `getUrl`, `delete`                                |
| `IPaymentProvider`       | `createOrder`, `capturePayment`, `refund`                   |
| `IShippingProvider`      | `checkServiceability`, `createShipment`, `track`            |
| `ISearchProvider`        | `search`, `suggest`, `index`, `remove`                      |
| `ProviderRegistry`       | Central DI container                                        |
| `registerProviders()`    | Call once at app startup                                    |
| `getProviders()`         | Access providers in route handlers                          |
| `LOCALE_CONFIG`          | INR/en-IN defaults, supported locales/currencies            |

## Provider Registry pattern

```ts
import { registerProviders } from "@mohasinac/appkit/contracts";
import { firebaseDbProvider } from "@mohasinac/appkit/providers/db-firebase";

// Call ONCE at app startup (e.g. providers.config.ts):
registerProviders({ db: firebaseDbProvider, ... });

// Inside API route handlers:
const { db } = getProviders();
const repo = db!.getRepository<Product>("products");
```
