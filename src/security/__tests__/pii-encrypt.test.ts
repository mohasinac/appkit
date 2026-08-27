/**
 * Real-crypto tests for the PII primitives.
 *
 * `appkit/src/security/` had no tests at all, and every repository test that
 * touches PII mocks the crypto away (`encryptPiiFields: (d) => d`). That is
 * precisely why two repositories shipped a helper that *looked* like it
 * encrypted and wrote plaintext instead: with the crypto stubbed to identity,
 * "encrypted" and "not encrypted" are the same object.
 *
 * These tests therefore use the real implementation and assert on the STORED
 * shape — the only assertion that can tell the two apart.
 */
import { describe, it, expect, beforeAll } from "vitest";

import {
  encryptValue,
  decryptValue,
  encryptPiiFields,
  decryptPiiFields,
  piiBlindIndex,
  piiIndicesFor,
  getPiiConfigError,
} from "../pii-encrypt";
import { isPiiEncrypted } from "../pii-mask";

// 32 bytes of hex. Test-only key; never a real one.
const TEST_KEY = "0".repeat(63) + "1";

beforeAll(() => {
  process.env.PII_ENCRYPTION_KEY = TEST_KEY;
  process.env.PII_HMAC_KEY = TEST_KEY;
});

describe("encryptValue / decryptValue", () => {
  it("round-trips a value", () => {
    const plain = "ravi.kumar@example.com";
    expect(decryptValue(encryptValue(plain))).toBe(plain);
  });

  it("does not store the plaintext", () => {
    const plain = "ravi.kumar@example.com";
    const cipher = encryptValue(plain);
    expect(cipher).not.toContain(plain);
    expect(isPiiEncrypted(cipher)).toBe(true);
  });

  it("is non-deterministic — the same input encrypts differently each time", () => {
    // A random IV per call. Equal ciphertexts would mean an attacker could tell
    // that two documents hold the same email just by comparing them.
    expect(encryptValue("same@example.com")).not.toBe(encryptValue("same@example.com"));
  });
});

describe("piiBlindIndex", () => {
  it("is deterministic, so it can back an equality lookup", () => {
    expect(piiBlindIndex("ravi@example.com")).toBe(piiBlindIndex("ravi@example.com"));
  });

  it("differs for different inputs and reveals no plaintext", () => {
    const idx = piiBlindIndex("ravi@example.com");
    expect(idx).not.toBe(piiBlindIndex("other@example.com"));
    expect(idx).not.toContain("ravi");
  });
});

describe("encryptPiiFields", () => {
  it("encrypts listed fields and leaves the rest alone", () => {
    const out = encryptPiiFields(
      { userName: "Ravi Kumar", rating: 5, title: "Great card" },
      ["userName"],
    ) as Record<string, unknown>;

    expect(out.userName).not.toBe("Ravi Kumar");
    expect(isPiiEncrypted(out.userName as string)).toBe(true);
    expect(out.rating).toBe(5);
    expect(out.title).toBe("Great card");
  });

  it("is idempotent — re-encrypting an encrypted value is a no-op", () => {
    const once = encryptPiiFields({ email: "a@b.com" }, ["email"]) as Record<string, unknown>;
    const twice = encryptPiiFields(once, ["email"]) as Record<string, unknown>;
    expect(twice.email).toBe(once.email);
  });

  it("round-trips through decryptPiiFields", () => {
    const original = { userName: "Ravi Kumar", userEmail: "ravi@example.com" };
    const stored = encryptPiiFields(original, ["userName", "userEmail"]);
    expect(decryptPiiFields(stored, ["userName", "userEmail"])).toMatchObject(original);
  });
});

describe("encryptPiiFields — dotted paths", () => {
  it("encrypts a nested field without disturbing its siblings", () => {
    const doc = {
      userId: "u1",
      deviceInfo: { ip: "203.0.113.1", browser: "Chrome" },
    };
    const out = encryptPiiFields(doc, ["deviceInfo.ip"]) as typeof doc;

    expect(isPiiEncrypted(out.deviceInfo.ip)).toBe(true);
    expect(out.deviceInfo.browser).toBe("Chrome");
    expect(out.userId).toBe("u1");
    expect(decryptValue(out.deviceInfo.ip)).toBe("203.0.113.1");
  });

  it("does not mutate the caller's object", () => {
    const doc = { deviceInfo: { ip: "203.0.113.1" } };
    encryptPiiFields(doc, ["deviceInfo.ip"]);
    expect(doc.deviceInfo.ip).toBe("203.0.113.1");
  });

  it("is a no-op when the path is absent", () => {
    const out = encryptPiiFields({ a: 1 }, ["deviceInfo.ip"]);
    expect(out).toEqual({ a: 1 });
  });

  it("is idempotent on a nested field", () => {
    const once = encryptPiiFields({ d: { ip: "1.2.3.4" } }, ["d.ip"]) as { d: { ip: string } };
    const twice = encryptPiiFields(once, ["d.ip"]) as { d: { ip: string } };
    expect(twice.d.ip).toBe(once.d.ip);
  });
});

describe("encryptPiiFields / decryptPiiFields — round-trip symmetry", () => {
  it("round-trips a NESTED field (the sessions case)", () => {
    // encrypt understood dotted paths while decrypt was still a flat loop, so a
    // nested field encrypted on write surfaced as ciphertext on read.
    const doc = { deviceInfo: { ip: "203.0.113.1", browser: "Chrome" } };
    const stored = encryptPiiFields(doc, ["deviceInfo.ip"]);
    const back = decryptPiiFields(stored, ["deviceInfo.ip"]) as typeof doc;

    expect(back.deviceInfo.ip).toBe("203.0.113.1");
    expect(back.deviceInfo.browser).toBe("Chrome");
  });

  it("round-trips an ARRAY-of-objects field (the conversations case)", () => {
    const doc = {
      messages: [
        { body: "hello there", at: 1 },
        { body: "second one", at: 2 },
      ],
    };
    const stored = encryptPiiFields(doc, ["messages[].body"]) as typeof doc;

    expect(isPiiEncrypted(stored.messages[0].body)).toBe(true);
    expect(isPiiEncrypted(stored.messages[1].body)).toBe(true);
    expect(stored.messages[0].at).toBe(1);

    const back = decryptPiiFields(stored, ["messages[].body"]) as typeof doc;
    expect(back.messages.map((m) => m.body)).toEqual(["hello there", "second one"]);
  });

  it("array form is idempotent and leaves non-object elements alone", () => {
    const once = encryptPiiFields({ m: [{ b: "x" }, null, "str"] }, ["m[].b"]);
    const twice = encryptPiiFields(once, ["m[].b"]);
    expect(twice).toEqual(once);
  });

  it("array form is a no-op when the path is not an array", () => {
    expect(encryptPiiFields({ m: "not-an-array" }, ["m[].b"])).toEqual({ m: "not-an-array" });
  });
});

describe("piiIndicesFor — and the deleted footgun it replaced", () => {
  const MAP = { userName: "userNameIndex" };

  /**
   * `addPiiIndices` was DELETED. It returned `{...source, ...indices}`, so
   * spreading its result over ciphertext restored the plaintext — that is how
   * `payouts.sellerEmail`, `payouts.upiId` and `reviews.userName` shipped in
   * cleartext, and how both token repositories wrote every verification and
   * reset email in cleartext.
   *
   * Reproduced LOCALLY rather than imported: the point of deleting it was that
   * no such function should be reachable, and a test importing it would keep
   * the export alive. This local copy is the shape the audit forbids.
   */
  const deletedAddPiiIndices = <T extends object>(
    obj: T,
    mapping: Record<string, string>,
  ): T => {
    const result = { ...obj } as Record<string, unknown>;
    for (const [sourceField, indexField] of Object.entries(mapping)) {
      const val = result[sourceField];
      if (typeof val === "string" && val) result[indexField] = piiBlindIndex(val);
    }
    return result as T;
  };

  it("piiIndicesFor returns ONLY index fields — no plaintext to spread back", () => {
    const indices = piiIndicesFor({ userName: "Ravi Kumar", rating: 5 }, MAP);
    expect(Object.keys(indices)).toEqual(["userNameIndex"]);
    expect(indices).not.toHaveProperty("userName");
    expect(indices).not.toHaveProperty("rating");
  });

  it("the deleted helper carried the source object along — the footgun itself", () => {
    const withIndices = deletedAddPiiIndices({ userName: "Ravi Kumar" }, MAP) as Record<
      string,
      unknown
    >;
    expect(withIndices.userName).toBe("Ravi Kumar");
  });

  it("the broken spread order writes plaintext; the fixed one does not", () => {
    const data = { userName: "Ravi Kumar" };

    const broken = {
      ...encryptPiiFields(data, ["userName"]),
      ...deletedAddPiiIndices(data, MAP),
    } as Record<string, unknown>;
    expect(broken.userName).toBe("Ravi Kumar"); // ← what shipped

    const fixed = {
      ...encryptPiiFields(data, ["userName"]),
      ...piiIndicesFor(data, MAP),
    } as Record<string, unknown>;
    expect(fixed.userName).not.toBe("Ravi Kumar");
    expect(isPiiEncrypted(fixed.userName as string)).toBe(true);
    expect(fixed.userNameIndex).toBe(piiBlindIndex("Ravi Kumar"));
  });
});

describe("getPiiConfigError", () => {
  it("accepts a valid 64-char hex key", () => {
    expect(getPiiConfigError()).toBeNull();
  });

  it("rejects a missing or malformed key", () => {
    const original = process.env.PII_ENCRYPTION_KEY;
    try {
      process.env.PII_ENCRYPTION_KEY = "";
      expect(getPiiConfigError()).toMatch(/64-character hex/);

      process.env.PII_ENCRYPTION_KEY = "z".repeat(64);
      expect(getPiiConfigError()).toMatch(/hexadecimal/);
    } finally {
      process.env.PII_ENCRYPTION_KEY = original;
    }
  });
});
