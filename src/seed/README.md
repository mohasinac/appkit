# `@mohasinac/appkit/seed`

Deterministic factory functions and named fixtures for populating Firestore in development, testing, and CI.

## Factories

| Factory | Key defaults |
|---|---|
| `makeProduct(overrides?)` | Realistic INR prices (99–9999), varied stock (5–200), Indian product names/categories |
| `makeFullProduct(overrides?)` | Like `makeProduct` + populated image URLs + tags |
| `makeUser(overrides?)` | Indian first/last names, email as `firstname.lastname{n}@example.com` |
| `makeFullUser(overrides?)` | Like `makeUser` + photoURL |
| `makeOrder(overrides?)` | Status, payment status, INR currency |
| `makeAddress(overrides?)` | Varied Indian cities/states, realistic postal codes |
| `makeFullAddress(overrides?)` | Like `makeAddress` + building name, Indian mobile number |
| `makeReview(overrides?)` | Realistic rating distribution (mostly 4–5★), Hindu review comments, varied helpfulCount |
| `makeCart(overrides?)` | Cart with items |
| `makeBid(overrides?)` | Auction bid |
| `makeNotification(overrides?)` | Push/email notification |
| `makeSession(overrides?)` | Auth session token |
| `makeCoupon(overrides?)` | Discount coupon |
| `makePayout(overrides?)` | Seller payout record |
| `makeBlogPost(overrides?)` | Blog post with slug/content |
| `makeFaq(overrides?)` | FAQ item |
| `makeStore(overrides?)` | Seller store |
| `makeCategory(overrides?)` | Category item |

## Named fixtures

Each factory exposes a `*_FIXTURES` object with pre-built instances:

```ts
import { PRODUCT_FIXTURES, USER_FIXTURES } from "@mohasinac/appkit/seed";

PRODUCT_FIXTURES.basic   // { id: "product-1", price: 199, ... }
USER_FIXTURES.admin      // { uid: "admin-user-1", roles: ["admin"], ... }
```

## Seed runner

```ts
import { runSeed, SeedConfig } from "@mohasinac/appkit/seed";
import { getProviders } from "@mohasinac/appkit/contracts";

const config: SeedConfig = {
  products: 20,
  users: 10,
  orders: 15,
};

await runSeed(getProviders().db!, config);
```
