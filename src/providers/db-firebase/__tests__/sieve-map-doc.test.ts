/**
 * Regression test for the Sieve read path skipping the repository's `mapDoc`.
 *
 * `applySieveToFirestore` mapped documents itself —
 * `deserializeTimestamps({ id, ...data })` — and never called the repository's
 * `mapDoc`. Every read that goes through Sieve therefore skipped whatever that
 * override did.
 *
 * That is not a cosmetic difference. `UserRepository.mapDoc` is what DECRYPTS
 * `email` and `phoneNumber`, and `UserRepository.list()` goes through here, so
 * `/api/admin/users` served `enc:v1:…` ciphertext as every user's email
 * address. `ReviewRepository.mapDoc` strips `helpfulVoterIds`, so the public
 * reviews list leaked who voted on what. Fourteen repositories were affected.
 *
 * These tests live at the `applySieveToFirestore` boundary because the failure
 * is INVISIBLE in the UI in both directions: before the fix an admin saw a
 * ciphertext-looking string and could reasonably assume that was by design;
 * after it, a regression would silently resume leaking. Neither state throws.
 */
import { describe, it, expect } from "vitest";
import { applySieveToFirestore } from "../sieve";
import type { CollectionReference } from "firebase-admin/firestore";

/** Minimal query double that yields the given documents. */
function makeQueryWithDocs(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  const q: Record<string, unknown> = {};
  Object.assign(q, {
    where: () => q,
    orderBy: () => q,
    limit: () => q,
    offset: () => q,
    startAfter: () => q,
    select: () => q,
    count: () => ({ get: async () => ({ data: () => ({ count: docs.length }) }) }),
    get: async () => ({
      docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
    }),
  });
  return q as unknown as CollectionReference;
}

const FIELDS = { status: { canFilter: true, canSort: true } };
const MODEL = { filters: "", sorts: "", page: "1", pageSize: "50" };

describe("applySieveToFirestore — row mapping", () => {
  it("routes every row through the injected mapper", async () => {
    const seen: string[] = [];
    const result = await applySieveToFirestore<{ id: string; email: string }>({
      baseQuery: makeQueryWithDocs([
        { id: "u1", data: { email: "enc:v1:AAA:BBB:CCC" } },
        { id: "u2", data: { email: "enc:v1:DDD:EEE:FFF" } },
      ]),
      model: MODEL,
      fields: FIELDS,
      // Stands in for `UserRepository.mapDoc`, which decrypts.
      mapDoc: (snap) => {
        seen.push(snap.id);
        const raw = snap.data() as { email: string };
        return { id: snap.id, email: raw.email.replace(/^enc:v1:.*$/, "real@example.com") };
      },
    });

    expect(seen).toEqual(["u1", "u2"]);
    expect(result.items.map((i) => i.email)).toEqual([
      "real@example.com",
      "real@example.com",
    ]);
    // The whole point: no ciphertext survives to the caller.
    expect(JSON.stringify(result.items)).not.toContain("enc:v1:");
  });

  it("without a mapper, reproduces the OLD shape exactly", async () => {
    // Proves the parameter is genuinely opt-in, so the ~40 repositories that
    // do not override mapDoc are provably unaffected by this change.
    const result = await applySieveToFirestore<{ id: string; email: string }>({
      baseQuery: makeQueryWithDocs([{ id: "u1", data: { email: "enc:v1:AAA:BBB:CCC" } }]),
      model: MODEL,
      fields: FIELDS,
    });

    expect(result.items).toEqual([{ id: "u1", email: "enc:v1:AAA:BBB:CCC" }]);
  });

  it("a mapper that drops a field keeps it out of the result", async () => {
    // `StoreRepository.mapDocForList` drops `whatsappConfig.accessToken`,
    // because `listStores(activeOnly)` backs the PUBLIC /stores page and
    // `mapDoc` decrypts that Meta OAuth bearer token.
    const result = await applySieveToFirestore<Record<string, unknown>>({
      baseQuery: makeQueryWithDocs([
        {
          id: "store-a",
          data: {
            storeName: "A",
            whatsappConfig: { connected: true, catalogId: "c1", accessToken: "SECRET" },
          },
        },
      ]),
      model: MODEL,
      fields: FIELDS,
      mapDoc: (snap) => {
        const doc = { id: snap.id, ...(snap.data() as Record<string, unknown>) };
        const cfg = doc.whatsappConfig as Record<string, unknown> | undefined;
        if (!cfg) return doc;
        const { accessToken: _dropped, ...safe } = cfg;
        return { ...doc, whatsappConfig: safe };
      },
    });

    expect(JSON.stringify(result.items)).not.toContain("SECRET");
    expect((result.items[0] as { whatsappConfig: Record<string, unknown> }).whatsappConfig)
      .toEqual({ connected: true, catalogId: "c1" });
  });
});
