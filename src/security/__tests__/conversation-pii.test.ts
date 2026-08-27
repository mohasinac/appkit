/**
 * `conversations` is the first real consumer of array-path PII
 * (`messages[].body`), so its round-trip is asserted directly.
 *
 * The shape matters: a message body lives in TWO places — inside the
 * `messages[]` array and denormalised into `lastMessage`. Encrypting one without
 * the other leaves every conversation's newest message readable at rest, which
 * is most of the exposure. These tests fail if either half is dropped.
 */
import { describe, it, expect, beforeAll } from "vitest";

import { encryptPiiFields, decryptPiiFields } from "../pii-encrypt";
import { isPiiEncrypted } from "../pii-mask";
import { CONVERSATION_PII_FIELDS } from "../pii-schemas";

const TEST_KEY = "0".repeat(63) + "1";
beforeAll(() => {
  process.env.PII_ENCRYPTION_KEY = TEST_KEY;
  process.env.PII_HMAC_KEY = TEST_KEY;
});

const FIELDS = [...CONVERSATION_PII_FIELDS];

function makeConversation() {
  return {
    buyerId: "user-ravi",
    buyerDisplayName: "Ravi Kumar",
    lastMessage: "is this still available?",
    messages: [
      { id: "m1", senderRole: "buyer", body: "hi, is this available?", isRead: true },
      { id: "m2", senderRole: "seller", body: "yes it is", isRead: false },
    ],
  };
}

describe("conversation PII", () => {
  it("encrypts BOTH the array bodies and the denormalised lastMessage", () => {
    const stored = encryptPiiFields(makeConversation(), FIELDS) as ReturnType<typeof makeConversation>;

    expect(isPiiEncrypted(stored.lastMessage)).toBe(true);
    expect(isPiiEncrypted(stored.messages[0].body)).toBe(true);
    expect(isPiiEncrypted(stored.messages[1].body)).toBe(true);
  });

  it("round-trips every body back to plaintext", () => {
    const stored = encryptPiiFields(makeConversation(), FIELDS);
    const back = decryptPiiFields(stored, FIELDS) as ReturnType<typeof makeConversation>;

    expect(back.lastMessage).toBe("is this still available?");
    expect(back.messages.map((m) => m.body)).toEqual([
      "hi, is this available?",
      "yes it is",
    ]);
  });

  it("leaves non-PII message fields untouched", () => {
    const stored = encryptPiiFields(makeConversation(), FIELDS) as ReturnType<typeof makeConversation>;

    expect(stored.messages[0].id).toBe("m1");
    expect(stored.messages[0].senderRole).toBe("buyer");
    expect(stored.messages[1].isRead).toBe(false);
    // display name stays readable per decision D1
    expect(stored.buyerDisplayName).toBe("Ravi Kumar");
  });

  it("is idempotent — markRead rewrites the array without re-encrypting", () => {
    // markRead reads raw (ciphertext), flips isRead, writes straight back.
    // If that path ever double-encrypted, decrypt would return ciphertext.
    const stored = encryptPiiFields(makeConversation(), FIELDS) as ReturnType<typeof makeConversation>;
    const afterMarkRead = {
      ...stored,
      messages: stored.messages.map((m) => ({ ...m, isRead: true })),
    };
    const reEncrypted = encryptPiiFields(afterMarkRead, FIELDS);
    const back = decryptPiiFields(reEncrypted, FIELDS) as ReturnType<typeof makeConversation>;

    expect(back.messages.map((m) => m.body)).toEqual([
      "hi, is this available?",
      "yes it is",
    ]);
    expect(back.messages.every((m) => m.isRead)).toBe(true);
  });

  it("an empty conversation encrypts to a no-op", () => {
    const empty = { lastMessage: "", messages: [] };
    expect(encryptPiiFields(empty, FIELDS)).toEqual(empty);
  });
});
