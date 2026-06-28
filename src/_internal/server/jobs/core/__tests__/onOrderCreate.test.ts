import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSendWhatsApp,
  mockBuildMessage,
  mockStoreFindBySlug,
  mockUserFindById,
  mockDecryptPii,
} = vi.hoisted(() => ({
  mockSendWhatsApp: vi.fn(),
  mockBuildMessage: vi.fn().mockReturnValue("Purchase announcement message"),
  mockStoreFindBySlug: vi.fn(),
  mockUserFindById: vi.fn(),
  mockDecryptPii: vi.fn((v: string) => v),
}));

vi.mock("../../../../../repositories", () => ({
  storeRepository: { findBySlug: mockStoreFindBySlug },
  userRepository: { findById: mockUserFindById },
}));

vi.mock("../../../../../features/whatsapp-bot/server", () => ({
  sendWhatsAppBusinessMessage: mockSendWhatsApp,
  buildPurchaseAnnouncementMessage: mockBuildMessage,
}));

vi.mock("../../../../../security/index", () => ({
  decryptPii: mockDecryptPii,
}));

vi.mock("../../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { handleOrderCreate } from "../onOrderCreate";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(envOverrides: Record<string, string | undefined> = {}) {
  const defaults: Record<string, string> = {
    WHATSAPP_PHONE_NUMBER_ID: "phone-number-id-123",
    WHATSAPP_CLOUD_API_TOKEN: "token-abc",
    WHATSAPP_ADMIN_NOTIFY_NUMBERS: "919876543210",
    ...envOverrides,
  };
  return {
    env: (key: string) => defaults[key],
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
}

function makeInput(overrides = {}) {
  return {
    orderId: "order-1",
    order: {
      buyerDisplayName: "Ravi Kumar",
      buyerId: "user-ravi",
      items: [{ title: "Pokemon Charizard" }],
      totalAmount: 25000,
      storeId: "store-pokemon-palace",
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendWhatsApp.mockResolvedValue(true);
  mockBuildMessage.mockReturnValue("Purchase announcement message");
  mockDecryptPii.mockImplementation((v: string) => v);
  mockStoreFindBySlug.mockResolvedValue(null);
  mockUserFindById.mockResolvedValue(null);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("handleOrderCreate — WhatsApp not configured", () => {
  it("skips when WHATSAPP_PHONE_NUMBER_ID is missing", async () => {
    const ctx = makeCtx({ WHATSAPP_PHONE_NUMBER_ID: undefined });
    await handleOrderCreate(makeInput(), ctx);
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
  });

  it("skips when WHATSAPP_CLOUD_API_TOKEN is missing", async () => {
    const ctx = makeCtx({ WHATSAPP_CLOUD_API_TOKEN: undefined });
    await handleOrderCreate(makeInput(), ctx);
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
  });

  it("logs that WhatsApp is not configured", async () => {
    const ctx = makeCtx({ WHATSAPP_PHONE_NUMBER_ID: undefined });
    await handleOrderCreate(makeInput(), ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/not configured/i),
      expect.any(Object),
    );
  });
});

describe("handleOrderCreate — admin notification", () => {
  it("sends announcement to each admin number in WHATSAPP_ADMIN_NOTIFY_NUMBERS", async () => {
    const ctx = makeCtx({ WHATSAPP_ADMIN_NOTIFY_NUMBERS: "919876543210,918765432109" });
    await handleOrderCreate(makeInput(), ctx);
    expect(mockSendWhatsApp).toHaveBeenCalledTimes(2);
  });

  it("sends to 0 admin numbers when env var is empty", async () => {
    const ctx = makeCtx({ WHATSAPP_ADMIN_NOTIFY_NUMBERS: "" });
    await handleOrderCreate(makeInput(), ctx);
    // No admin calls, store lookup still happens
    const waCallArgs = mockSendWhatsApp.mock.calls.map((c) => c[0].toPhone);
    expect(waCallArgs).toHaveLength(0);
  });

  it("strips non-digit chars from admin numbers", async () => {
    const ctx = makeCtx({ WHATSAPP_ADMIN_NOTIFY_NUMBERS: "+91 987-654-3210" });
    await handleOrderCreate(makeInput(), ctx);
    const call = mockSendWhatsApp.mock.calls[0][0];
    expect(call.toPhone).toBe("919876543210");
  });

  it("sends announcement with the built message", async () => {
    const ctx = makeCtx();
    mockBuildMessage.mockReturnValue("Custom message content");
    await handleOrderCreate(makeInput(), ctx);
    const call = mockSendWhatsApp.mock.calls[0][0];
    expect(call.message).toBe("Custom message content");
  });

  it("one admin send failure is non-fatal, function still completes", async () => {
    const ctx = makeCtx({ WHATSAPP_ADMIN_NOTIFY_NUMBERS: "91111,91222" });
    mockSendWhatsApp.mockRejectedValueOnce(new Error("WA error")).mockResolvedValue(true);
    await expect(handleOrderCreate(makeInput(), ctx)).resolves.toBeUndefined();
  });
});

describe("handleOrderCreate — store owner notification", () => {
  it("sends to store owner phone when store + owner + phone all exist", async () => {
    mockStoreFindBySlug.mockResolvedValue({ ownerId: "user-seller-1" });
    mockUserFindById.mockResolvedValue({ phoneNumber: "encrypted_phone_91999" });
    mockDecryptPii.mockReturnValue("919999999999");

    const ctx = makeCtx({ WHATSAPP_ADMIN_NOTIFY_NUMBERS: "" });
    await handleOrderCreate(makeInput({ storeId: "store-A" }), ctx);
    expect(mockSendWhatsApp).toHaveBeenCalledWith(
      expect.objectContaining({ toPhone: "919999999999" }),
    );
  });

  it("skips store owner if store not found", async () => {
    mockStoreFindBySlug.mockResolvedValue(null);
    const ctx = makeCtx({ WHATSAPP_ADMIN_NOTIFY_NUMBERS: "" });
    await handleOrderCreate(makeInput({ storeId: "store-nonexistent" }), ctx);
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
  });

  it("skips store owner if owner has no phone number", async () => {
    mockStoreFindBySlug.mockResolvedValue({ ownerId: "user-seller-1" });
    mockUserFindById.mockResolvedValue({ phoneNumber: null });
    const ctx = makeCtx({ WHATSAPP_ADMIN_NOTIFY_NUMBERS: "" });
    await handleOrderCreate(makeInput({ storeId: "store-A" }), ctx);
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
  });

  it("skips store owner notification when storeId is absent from order", async () => {
    const ctx = makeCtx({ WHATSAPP_ADMIN_NOTIFY_NUMBERS: "" });
    await handleOrderCreate(makeInput({ storeId: undefined }), ctx);
    expect(mockStoreFindBySlug).not.toHaveBeenCalled();
  });

  it("store owner lookup failure is non-fatal", async () => {
    mockStoreFindBySlug.mockRejectedValue(new Error("Firestore error"));
    const ctx = makeCtx();
    await expect(handleOrderCreate(makeInput(), ctx)).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/Store owner lookup failed/i),
      expect.any(Error),
      expect.any(Object),
    );
  });
});

describe("handleOrderCreate — message content", () => {
  it("uses buyerDisplayName in announcement", async () => {
    const ctx = makeCtx();
    await handleOrderCreate(makeInput({ buyerDisplayName: "Priya Singh" }), ctx);
    expect(mockBuildMessage).toHaveBeenCalledWith(
      expect.objectContaining({ buyerName: "Priya Singh" }),
    );
  });

  it("uses 'A customer' as fallback when buyerDisplayName is missing", async () => {
    const ctx = makeCtx();
    await handleOrderCreate(makeInput({ buyerDisplayName: undefined }), ctx);
    expect(mockBuildMessage).toHaveBeenCalledWith(
      expect.objectContaining({ buyerName: "A customer" }),
    );
  });

  it("uses first item title as firstItemName", async () => {
    const ctx = makeCtx();
    await handleOrderCreate(makeInput({ items: [{ title: "Charizard PSA 9" }] }), ctx);
    expect(mockBuildMessage).toHaveBeenCalledWith(
      expect.objectContaining({ firstItemName: "Charizard PSA 9" }),
    );
  });

  it("falls back to item.name when title is missing", async () => {
    const ctx = makeCtx();
    await handleOrderCreate(makeInput({ items: [{ name: "Blastoise" }] }), ctx);
    expect(mockBuildMessage).toHaveBeenCalledWith(
      expect.objectContaining({ firstItemName: "Blastoise" }),
    );
  });

  it("additionalItemCount = items.length - 1", async () => {
    const ctx = makeCtx();
    const items = [{ title: "A" }, { title: "B" }, { title: "C" }];
    await handleOrderCreate(makeInput({ items }), ctx);
    expect(mockBuildMessage).toHaveBeenCalledWith(
      expect.objectContaining({ additionalItemCount: 2 }),
    );
  });
});
