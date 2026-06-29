import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSiteSettingsUpdateSingleton,
  mockSiteSettingsGetSingleton,
} = vi.hoisted(() => ({
  mockSiteSettingsUpdateSingleton: vi.fn(),
  mockSiteSettingsGetSingleton: vi.fn(),
}));

vi.mock("../../../../features/admin/repository/site-settings.repository", () => ({
  siteSettingsRepository: {
    updateSingleton: mockSiteSettingsUpdateSingleton,
    getSingleton: mockSiteSettingsGetSingleton,
  },
}));

import { updateActionConfigDomain, updateNavConfigDomain } from "../actions";

describe("updateActionConfigDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteSettingsUpdateSingleton.mockResolvedValue(undefined);
  });

  it("valid → siteSettingsRepository.updateSingleton called with actionConfig", async () => {
    await updateActionConfigDomain("place_bids", false);
    expect(mockSiteSettingsUpdateSingleton).toHaveBeenCalledWith(
      expect.objectContaining({
        actionConfig: { place_bids: { enabled: false } },
      }),
    );
  });

  it("enable action → actionConfig[actionId].enabled = true", async () => {
    await updateActionConfigDomain("add_to_cart", true);
    expect(mockSiteSettingsUpdateSingleton).toHaveBeenCalledWith(
      expect.objectContaining({
        actionConfig: { add_to_cart: { enabled: true } },
      }),
    );
  });

  it("disable action → actionConfig[actionId].enabled = false", async () => {
    await updateActionConfigDomain("checkout", false);
    const callArg = mockSiteSettingsUpdateSingleton.mock.calls[0][0];
    expect(callArg.actionConfig.checkout.enabled).toBe(false);
  });

  it("only updates the one key (sparse merge)", async () => {
    await updateActionConfigDomain("place_bids", false);
    const callArg = mockSiteSettingsUpdateSingleton.mock.calls[0][0];
    expect(Object.keys(callArg.actionConfig)).toHaveLength(1);
  });

  it("resolves without error on success", async () => {
    await expect(updateActionConfigDomain("place_bids", false)).resolves.toBeUndefined();
  });
});

describe("updateNavConfigDomain", () => {
  const allNavItems = [
    { id: "nav-products", href: "/products" },
    { id: "nav-auctions", href: "/auctions" },
    { id: "nav-stores", href: "/stores" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteSettingsGetSingleton.mockResolvedValue({ navConfig: {} });
    mockSiteSettingsUpdateSingleton.mockResolvedValue(undefined);
  });

  it("valid → siteSettingsRepository.updateSingleton called with navConfig", async () => {
    await updateNavConfigDomain("nav-auctions", false, allNavItems);
    expect(mockSiteSettingsUpdateSingleton).toHaveBeenCalledWith(
      expect.objectContaining({
        navConfig: expect.objectContaining({ "nav-auctions": { enabled: false } }),
      }),
    );
  });

  it("disabling a nav item → href appears in disabledRoutes", async () => {
    await updateNavConfigDomain("nav-auctions", false, allNavItems);
    const callArg = mockSiteSettingsUpdateSingleton.mock.calls[0][0];
    expect(callArg.disabledRoutes).toContain("/auctions");
  });

  it("disabling a nav item → other enabled items not in disabledRoutes", async () => {
    await updateNavConfigDomain("nav-auctions", false, allNavItems);
    const callArg = mockSiteSettingsUpdateSingleton.mock.calls[0][0];
    expect(callArg.disabledRoutes).not.toContain("/products");
    expect(callArg.disabledRoutes).not.toContain("/stores");
  });

  it("enabling a nav item → href removed from disabledRoutes", async () => {
    mockSiteSettingsGetSingleton.mockResolvedValue({
      navConfig: { "nav-auctions": { enabled: false }, "nav-products": { enabled: false } },
    });
    await updateNavConfigDomain("nav-auctions", true, allNavItems);
    const callArg = mockSiteSettingsUpdateSingleton.mock.calls[0][0];
    expect(callArg.disabledRoutes).not.toContain("/auctions");
  });

  it("existing navConfig merged (not overwritten)", async () => {
    mockSiteSettingsGetSingleton.mockResolvedValue({
      navConfig: { "nav-products": { enabled: false } },
    });
    await updateNavConfigDomain("nav-auctions", false, allNavItems);
    const callArg = mockSiteSettingsUpdateSingleton.mock.calls[0][0];
    expect(callArg.navConfig["nav-products"]).toEqual({ enabled: false });
    expect(callArg.navConfig["nav-auctions"]).toEqual({ enabled: false });
  });

  it("resolves without error on success", async () => {
    await expect(updateNavConfigDomain("nav-auctions", false, allNavItems)).resolves.toBeUndefined();
  });
});
