import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection } = makeMockDb();

const { mockCacheManager, mockDecryptSecret } = vi.hoisted(() => ({
  mockCacheManager: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    delete: vi.fn(),
  },
  mockDecryptSecret: vi.fn((v: string) => v.replace("enc:", "")),
}));

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return {
    ...actual,
    prepareForFirestore: (d: Record<string, unknown>) => d,
  };
});

vi.mock("../../../../core", () => ({
  cacheManager: mockCacheManager,
}));

vi.mock("../../../../security", () => ({
  encryptSecret: (v: string) => `enc:${v}`,
  decryptSecret: mockDecryptSecret,
  maskSecret: (v: string) => `${v.slice(0, 4)}***`,
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { SiteSettingsRepository } from "../site-settings.repository";

// Create a fresh repo per test to avoid shared state from `siteSettingsRepository` singleton
function makeRepo() {
  return new SiteSettingsRepository();
}

function makeSettingsDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "global",
    branding: { siteName: "LetItRip", tagline: "India's largest collectibles marketplace" },
    credentials: {},
    featureFlags: { useMockPayment: false, useMockShipping: false },
    features: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCacheManager.get.mockReturnValue(null);
  mockDecryptSecret.mockImplementation((v: string) => v.replace("enc:", ""));
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  const settingsDoc = makeSettingsDoc();
  mockDocRef.get.mockResolvedValue(makeSnap(settingsDoc, "global"));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// getSingleton
// ---------------------------------------------------------------------------
describe("SiteSettingsRepository.getSingleton", () => {
  it("returns cached value without hitting Firestore when cache is warm", async () => {
    const cached = makeSettingsDoc({ branding: { siteName: "Cached LetItRip" } });
    mockCacheManager.get.mockReturnValue(cached);
    const repo = makeRepo();
    const result = await repo.getSingleton();
    expect(result.branding.siteName).toBe("Cached LetItRip");
    expect(mockDocRef.get).not.toHaveBeenCalled();
  });

  it("fetches from Firestore when cache is cold (null)", async () => {
    mockCacheManager.get.mockReturnValue(null);
    const repo = makeRepo();
    await repo.getSingleton();
    expect(mockDocRef.get).toHaveBeenCalledOnce();
  });

  it("populates cache after Firestore fetch", async () => {
    mockCacheManager.get.mockReturnValue(null);
    const settingsDoc = makeSettingsDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(settingsDoc, "global"));
    const repo = makeRepo();
    await repo.getSingleton();
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      expect.stringContaining("site-settings"),
      expect.anything(),
      expect.objectContaining({ ttl: expect.any(Number) }),
    );
  });

  it("creates default settings when document does not exist", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const repo = makeRepo();
    await repo.getSingleton();
    expect(mockDocRef.set).toHaveBeenCalledOnce();
  });

  it("returns default settings when document does not exist", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const repo = makeRepo();
    const result = await repo.getSingleton();
    expect(result.id).toBe("global");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("caches the newly-created default settings", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const repo = makeRepo();
    await repo.getSingleton();
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      expect.stringContaining("site-settings"),
      expect.anything(),
      expect.objectContaining({ ttl: expect.any(Number) }),
    );
  });
});

// ---------------------------------------------------------------------------
// updateSingleton
// ---------------------------------------------------------------------------
describe("SiteSettingsRepository.updateSingleton", () => {
  it("clears cache before writing", async () => {
    const repo = makeRepo();
    await repo.updateSingleton({ branding: { siteName: "New Name" } } as never);
    expect(mockCacheManager.delete).toHaveBeenCalledWith(
      expect.stringContaining("site-settings"),
    );
    // delete happens before the update
    const deleteCallOrder = mockCacheManager.delete.mock.invocationCallOrder[0];
    const updateCallOrder = mockDocRef.update.mock.invocationCallOrder[0];
    expect(deleteCallOrder).toBeLessThan(updateCallOrder);
  });

  it("writes updatedAt timestamp", async () => {
    const repo = makeRepo();
    await repo.updateSingleton({ branding: { siteName: "New" } } as never);
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.updatedAt).toBeInstanceOf(Date);
  });

  it("encrypts credential values before writing", async () => {
    const settingsDoc = makeSettingsDoc({ credentials: {} });
    mockDocRef.get.mockResolvedValue(makeSnap(settingsDoc, "global"));
    const repo = makeRepo();
    await repo.updateSingleton({
      credentials: { razorpayKeyId: "rzp_live_abc123" },
    } as never);
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    const creds = updateArg.credentials as Record<string, string>;
    expect(creds.razorpayKeyId).toBe("enc:rzp_live_abc123");
  });

  it("does not overwrite existing credential with empty string", async () => {
    const settingsDoc = makeSettingsDoc({
      credentials: { razorpayKeyId: "enc:existing-key" },
    });
    mockDocRef.get.mockResolvedValue(makeSnap(settingsDoc, "global"));
    const repo = makeRepo();
    await repo.updateSingleton({
      credentials: { razorpayKeyId: "" },
    } as never);
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    const creds = updateArg.credentials as Record<string, string>;
    // Empty string → keep existing
    expect(creds.razorpayKeyId).toBe("enc:existing-key");
  });

  it("re-caches the latest settings after update", async () => {
    const repo = makeRepo();
    await repo.updateSingleton({ branding: { siteName: "Updated" } } as never);
    // getSingleton is called after update to get latest — cacheManager.set re-called
    expect(mockCacheManager.set).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getDecryptedCredentials
// ---------------------------------------------------------------------------
describe("SiteSettingsRepository.getDecryptedCredentials", () => {
  it("returns decrypted API key values", async () => {
    const settingsDoc = makeSettingsDoc({
      credentials: { razorpayKeyId: "enc:rzp_live_abc123" },
    });
    mockDocRef.get.mockResolvedValue(makeSnap(settingsDoc, "global"));
    const repo = makeRepo();
    const result = await repo.getDecryptedCredentials();
    expect(result.razorpayKeyId).toBe("rzp_live_abc123");
  });

  it("falls back to empty string when decryption fails", async () => {
    mockDecryptSecret.mockImplementationOnce(() => {
      throw new Error("auth-tag mismatch");
    });
    const settingsDoc = makeSettingsDoc({
      credentials: { razorpayKeyId: "corrupt-blob" },
    });
    mockDocRef.get.mockResolvedValue(makeSnap(settingsDoc, "global"));
    const repo = makeRepo();
    const result = await repo.getDecryptedCredentials();
    expect(result.razorpayKeyId).toBe("");
  });

  it("returns empty object when no credentials stored", async () => {
    const settingsDoc = makeSettingsDoc({ credentials: {} });
    mockDocRef.get.mockResolvedValue(makeSnap(settingsDoc, "global"));
    const repo = makeRepo();
    const result = await repo.getDecryptedCredentials();
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getCredentialsMasked
// ---------------------------------------------------------------------------
describe("SiteSettingsRepository.getCredentialsMasked", () => {
  it("replaces credential values with masked versions", async () => {
    const settingsDoc = makeSettingsDoc({
      credentials: { razorpayKeyId: "enc:rzp_live_abc123" },
    });
    mockDocRef.get.mockResolvedValue(makeSnap(settingsDoc, "global"));
    const repo = makeRepo();
    const result = await repo.getCredentialsMasked();
    // maskSecret("rzp_live_abc123") → "rzp_***" per our mock
    expect(result.razorpayKeyId).toBe("rzp_***");
  });

  it("does not expose raw or encrypted credential values", async () => {
    const settingsDoc = makeSettingsDoc({
      credentials: { razorpayKeyId: "enc:secret-key" },
    });
    mockDocRef.get.mockResolvedValue(makeSnap(settingsDoc, "global"));
    const repo = makeRepo();
    const result = await repo.getCredentialsMasked();
    expect(result.razorpayKeyId).not.toContain("secret-key");
    expect(result.razorpayKeyId).not.toContain("enc:");
  });

  it("empty/falsy credential value → key omitted from masked output", async () => {
    // getDecryptedCredentials skips falsy values; getCredentialsMasked
    // only iterates decrypted keys → empty stored credential does not appear in output
    const settingsDoc = makeSettingsDoc({ credentials: { razorpayKeyId: "" } });
    mockDocRef.get.mockResolvedValue(makeSnap(settingsDoc, "global"));
    const repo = makeRepo();
    const result = await repo.getCredentialsMasked();
    expect(result).not.toHaveProperty("razorpayKeyId");
  });
});

// ---------------------------------------------------------------------------
// getFeatures / updateFeatures
// ---------------------------------------------------------------------------
describe("SiteSettingsRepository.getFeatures", () => {
  it("returns the features array from settings", async () => {
    const features = [{ id: "f-1", name: "Fast Checkout", description: "Quick buy", icon: "zap", enabled: true }];
    const settingsDoc = makeSettingsDoc({ features });
    mockDocRef.get.mockResolvedValue(makeSnap(settingsDoc, "global"));
    const repo = makeRepo();
    const result = await repo.getFeatures();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Fast Checkout");
  });

  it("returns empty array when no features stored", async () => {
    const settingsDoc = makeSettingsDoc({ features: undefined });
    mockDocRef.get.mockResolvedValue(makeSnap(settingsDoc, "global"));
    const repo = makeRepo();
    const result = await repo.getFeatures();
    expect(result).toEqual([]);
  });
});

describe("SiteSettingsRepository.updateFeatures", () => {
  it("writes features array to Firestore", async () => {
    const repo = makeRepo();
    const features = [{ id: "f-1", name: "F1", description: "D1", icon: "star", enabled: true }];
    await repo.updateFeatures(features);
    expect(mockDocRef.update).toHaveBeenCalled();
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.features).toEqual(features);
  });
});

// ---------------------------------------------------------------------------
// exists
// ---------------------------------------------------------------------------
describe("SiteSettingsRepository.exists", () => {
  it("returns true when singleton document exists", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(makeSettingsDoc(), "global"));
    const repo = makeRepo();
    const result = await repo.exists();
    expect(result).toBe(true);
  });

  it("returns false when document does not exist", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const repo = makeRepo();
    const result = await repo.exists();
    expect(result).toBe(false);
  });

  it("returns false when Firestore throws", async () => {
    mockDocRef.get.mockRejectedValue(new Error("Firestore unavailable"));
    const repo = makeRepo();
    const result = await repo.exists();
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resetToDefaults
// ---------------------------------------------------------------------------
describe("SiteSettingsRepository.resetToDefaults", () => {
  it("overwrites the singleton with default settings", async () => {
    const repo = makeRepo();
    await repo.resetToDefaults();
    expect(mockDocRef.set).toHaveBeenCalledOnce();
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.id).toBe("global");
  });

  it("caches the reset defaults", async () => {
    const repo = makeRepo();
    await repo.resetToDefaults();
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      expect.stringContaining("site-settings"),
      expect.anything(),
      expect.objectContaining({ ttl: expect.any(Number) }),
    );
  });
});
