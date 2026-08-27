/**
 * The PII and settings crypto systems share the `enc:v1:` prefix.
 *
 *   PII      `enc:v1:` iv `:` ciphertext `:` tag   — PII_ENCRYPTION_KEY
 *   settings `enc:v1:` iv `.` tag `.` ciphertext   — SETTINGS_ENCRYPTION_KEY
 *
 * Neither prefix can be changed: `enc:v1:` is stamped into every encrypted
 * value across twelve collections and a new one orphans all of it. So the two
 * are told apart structurally instead — base64's alphabet contains neither
 * `.` nor `:`, which makes the shapes unambiguous in the data.
 *
 * These are unit tests rather than tester-checklist cases because the failure
 * is invisible in the UI: feeding a value to the wrong decryptor throws deep
 * inside a repository and surfaces as a generic 500 that names neither the key
 * nor the format. And `hmacBlindIndex`'s key stability is worse still — a
 * desynced blind index makes `findByEmail` return null, which is
 * indistinguishable from "no such user". Nothing errors; people just stop
 * being findable.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { encEnvelopeKind, hasEncPrefix, isPiiEncrypted, ENC_PREFIX } from "../pii-mask";

const PII_SHAPE = `${ENC_PREFIX}aXZiNjQ=:Y2lwaGVy:dGFn`;
const SETTINGS_SHAPE = `${ENC_PREFIX}aXZiNjQ=.dGFn.Y2lwaGVy`;

describe("encEnvelopeKind", () => {
  it("tells the two systems apart by separator", () => {
    expect(encEnvelopeKind(PII_SHAPE)).toBe("pii");
    expect(encEnvelopeKind(SETTINGS_SHAPE)).toBe("settings");
  });

  it("returns null for anything not carrying the prefix", () => {
    expect(encEnvelopeKind("plain@example.com")).toBeNull();
    expect(encEnvelopeKind("")).toBeNull();
    expect(encEnvelopeKind(undefined)).toBeNull();
    expect(encEnvelopeKind(42)).toBeNull();
  });

  it("returns null for a prefixed value of neither shape", () => {
    // Malformed — must not be routed to either decryptor.
    expect(encEnvelopeKind(`${ENC_PREFIX}only-one-part`)).toBeNull();
    expect(encEnvelopeKind(`${ENC_PREFIX}a:b.c`)).toBeNull();
  });

  it("isPiiEncrypted is PII-only; hasEncPrefix covers both plus malformed", () => {
    expect(isPiiEncrypted(PII_SHAPE)).toBe(true);
    expect(isPiiEncrypted(SETTINGS_SHAPE)).toBe(false);

    // The display masks use hasEncPrefix, because a settings-encrypted or
    // malformed value is just as unshowable as a PII one. Narrowing them to
    // `kind === "pii"` would let those two render verbatim in the UI.
    expect(hasEncPrefix(PII_SHAPE)).toBe(true);
    expect(hasEncPrefix(SETTINGS_SHAPE)).toBe(true);
    expect(hasEncPrefix(`${ENC_PREFIX}garbage`)).toBe(true);
    expect(hasEncPrefix("plain@example.com")).toBe(false);
  });
});

describe("hmacBlindIndex — key stability", () => {
  // The highest-value assertion here. `Buffer.from(x, "hex")` does not throw on
  // bad input, it truncates at the first non-hex byte. `getEncKey` normalised
  // its read and `getHmacKey` did not, so a BOM or trailing CR on one env var
  // gave the two functions DIFFERENT keys — and every blind index written
  // afterwards became unmatchable against the ones already stored.
  const KEY = "a".repeat(64);
  let hmacBlindIndex: (v: string) => string;

  beforeAll(async () => {
    process.env.PII_ENCRYPTION_KEY = KEY;
    ({ hmacBlindIndex } = await import("../pii-encrypt"));
  });

  it("is identical for a clean key, a BOM'd key and a CR-terminated key", () => {
    process.env.PII_ENCRYPTION_KEY = KEY;
    const clean = hmacBlindIndex("ravi@example.com");

    process.env.PII_ENCRYPTION_KEY = `﻿${KEY}`;
    expect(hmacBlindIndex("ravi@example.com")).toBe(clean);

    process.env.PII_ENCRYPTION_KEY = `${KEY}\r\n`;
    expect(hmacBlindIndex("ravi@example.com")).toBe(clean);

    process.env.PII_ENCRYPTION_KEY = `  ${KEY}  `;
    expect(hmacBlindIndex("ravi@example.com")).toBe(clean);
  });

  it("refuses a key that is not 64 hex chars instead of truncating it", () => {
    process.env.PII_ENCRYPTION_KEY = "not-hex-at-all";
    expect(() => hmacBlindIndex("ravi@example.com")).toThrow(/64-character hex/);
    process.env.PII_ENCRYPTION_KEY = KEY;
  });
});
