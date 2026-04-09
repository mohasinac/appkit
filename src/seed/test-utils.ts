// appkit/src/seed/test-utils.ts
// Server-only — used in integration tests and Firestore emulator setup.
import type { SeedConfig } from "./types";
import { runSeed } from "./runner";
import { encryptPiiFields, decryptPiiFields, ENC_PREFIX } from "../security/pii-encrypt";
import { DEFAULT_CATEGORIES } from "./defaults/categories";
import { DEFAULT_FAQS } from "./defaults/faqs";
import { makeProduct } from "./factories/product.factory";
import { USER_FIXTURES } from "./factories/user.factory";
import type { SeedBaseUserDocument } from "./factories/user.factory";
import type { SeedBaseProductDocument } from "./factories/product.factory";
import type { SeedBaseStoreDocument } from "./factories/store.factory";
import { makeStore } from "./factories/store.factory";
import type { SeedBaseOrderDocument } from "./factories/order.factory";
import type { SeedCategoryDocument } from "./factories/category.factory";
import type { SeedFaqDocument } from "./factories/faq.factory";

// ---------------------------------------------------------------------------
// PII round-trip assertion
// ---------------------------------------------------------------------------

/**
 * Assert that every `piiField` in `doc` is encrypted and can be decrypted
 * back to the original plaintext.
 *
 * Throws a descriptive error on any violation — use in tests.
 *
 * @example
 * ```ts
 * const user = makeFullUser({ email: "test@example.com", phone: "+919876543210" });
 * await assertPiiRoundTrip(user, ["email", "phone"]);
 * ```
 */
export async function assertPiiRoundTrip<T extends Record<string, unknown>>(
  doc: T,
  piiFields: Array<keyof T & string>,
): Promise<void> {
  const encrypted = encryptPiiFields(doc, piiFields as string[]);

  for (const field of piiFields) {
    const val = encrypted[field] as string;
    if (!val.startsWith(ENC_PREFIX)) {
      throw new Error(
        `assertPiiRoundTrip: field "${String(field)}" was NOT encrypted. Got: ${val}`,
      );
    }
    // Verify blind index was written
    const indexKey = `${String(field)}Index`;
    if (!encrypted[indexKey]) {
      throw new Error(
        `assertPiiRoundTrip: blind index "${indexKey}" is missing after encryption.`,
      );
    }
  }

  const decrypted = decryptPiiFields(encrypted, piiFields as string[]);

  for (const field of piiFields) {
    if (decrypted[field] !== doc[field]) {
      throw new Error(
        `assertPiiRoundTrip: field "${String(field)}" round-trip mismatch. ` +
          `Expected "${String(doc[field])}", got "${String(decrypted[field])}"`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Firestore emulator seed helper
// ---------------------------------------------------------------------------

export interface TestSeedHandles {
  users: SeedBaseUserDocument[];
  products: SeedBaseProductDocument[];
  stores: SeedBaseStoreDocument[];
  orders: SeedBaseOrderDocument[];
  categories: SeedCategoryDocument[];
  faqs: SeedFaqDocument[];
}

/**
 * Seed the Firestore emulator with a predictable, minimal dataset.
 *
 * Uses the `FIRESTORE_EMULATOR_PROJECT_ID` env var (default: "demo-test").
 * Requires the emulator to be running before calling this.
 *
 * @example
 * ```ts
 * // jest.setup.ts
 * beforeAll(async () => {
 *   const handles = await seedForTest();
 *   globalThis.__testUsers = handles.users;
 * });
 * ```
 */
export async function seedForTest(
  overrides?: Partial<{
    users: SeedBaseUserDocument[];
    products: SeedBaseProductDocument[];
    stores: SeedBaseStoreDocument[];
    orders: SeedBaseOrderDocument[];
  }>,
): Promise<TestSeedHandles> {
  const users = overrides?.users ?? Object.values(USER_FIXTURES);
  const products =
    overrides?.products ??
    Array.from({ length: 5 }, (_, i) => makeProduct({ id: `p-${i + 1}` }));
  const stores = overrides?.stores ?? [makeStore({ id: "store-1" })];
  const orders = overrides?.orders ?? [];

  const seedConfig: SeedConfig = {
    projectId:
      process.env["FIRESTORE_EMULATOR_PROJECT_ID"] ?? "demo-test",
    collections: [
      {
        collection: "users",
        data: users,
        idField: "uid",
        piiFields: ["email"],
      },
      {
        collection: "products",
        data: products,
      },
      {
        collection: "stores",
        data: stores,
        piiFields: ["ownerEmail"],
      },
      {
        collection: "orders",
        data: orders,
      },
      {
        collection: "categories",
        data: DEFAULT_CATEGORIES,
      },
      {
        collection: "faqs",
        data: DEFAULT_FAQS,
      },
    ],
  };

  await runSeed(seedConfig);

  return {
    users,
    products,
    stores,
    orders,
    categories: DEFAULT_CATEGORIES,
    faqs: DEFAULT_FAQS,
  };
}
