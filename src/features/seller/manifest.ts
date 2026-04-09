import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "seller",
  i18nNamespace: "seller",
  envKeys: [],
  routes: [
    { segment: "[locale]/seller", exports: { default: "SellerDashboardView" } },
    {
      segment: "[locale]/seller/products",
      exports: { default: "SellerProductsView" },
    },
    {
      segment: "[locale]/seller/products/new",
      exports: { default: "SellerCreateProductView" },
    },
    {
      segment: "[locale]/seller/products/[id]",
      exports: { default: "SellerEditProductView" },
    },
    {
      segment: "[locale]/seller/orders",
      exports: { default: "SellerOrdersView" },
    },
    {
      segment: "[locale]/seller/payouts",
      exports: { default: "SellerPayoutsView" },
    },
    {
      segment: "[locale]/seller/store",
      exports: { default: "SellerStoreSetupView" },
    },
    {
      segment: "[locale]/seller/analytics",
      exports: { default: "SellerAnalyticsView" },
    },
    {
      segment: "[locale]/seller/coupons",
      exports: { default: "SellerCouponsView" },
    },
    {
      segment: "[locale]/seller/shipping",
      exports: { default: "SellerShippingView" },
    },
    {
      segment: "[locale]/seller/addresses",
      exports: { default: "SellerAddressesView" },
    },
    {
      segment: "[locale]/become-a-seller",
      exports: { default: "SellerGuideView" },
    },
    { segment: "[locale]/sellers", exports: { default: "SellersListView" } },
  ],
  apiRoutes: [
    { segment: "api/seller/dashboard", methods: ["GET"] },
    { segment: "api/seller/products", methods: ["GET", "POST"] },
    {
      segment: "api/seller/products/[id]",
      methods: ["GET", "PATCH", "DELETE"],
    },
    { segment: "api/seller/orders", methods: ["GET"] },
    { segment: "api/seller/payouts", methods: ["GET", "POST"] },
    { segment: "api/seller/store", methods: ["GET", "PATCH"] },
    { segment: "api/seller/analytics", methods: ["GET"] },
    { segment: "api/seller/coupons", methods: ["GET", "POST"] },
    { segment: "api/seller/coupons/[id]", methods: ["PATCH", "DELETE"] },
    { segment: "api/seller/shipping", methods: ["GET", "PATCH"] },
    {
      segment: "api/seller/addresses",
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
    { segment: "api/sellers", methods: ["GET"] },
    { segment: "api/sellers/[storeSlug]", methods: ["GET"] },
  ],
};
