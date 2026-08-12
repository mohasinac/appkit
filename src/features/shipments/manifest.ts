import type { FeatureManifest } from "../../contracts";

export const manifest: FeatureManifest = {
  name: "shipments",
  i18nNamespace: "shipments",
  envKeys: [],
  routes: [
    { segment: "[locale]/admin/shipments", exports: { default: "AdminShipmentsView" } },
    { segment: "[locale]/admin/shipments/new", exports: { default: "AdminShipmentEditorView" } },
    { segment: "[locale]/admin/shipments/[id]/edit", exports: { default: "AdminShipmentEditorView" } },
    {
      segment: "[locale]/admin/shipments/[id]/lots/[lotId]/items",
      exports: { default: "AdminShipmentLotItemsView" },
    },
    { segment: "[locale]/admin/shipments/projections", exports: { default: "AdminShipmentProjectionsView" } },
  ],
  apiRoutes: [
    { segment: "api/admin/shipments", methods: ["GET", "POST"] },
    { segment: "api/admin/shipments/[id]", methods: ["GET", "PATCH", "DELETE"] },
    { segment: "api/admin/shipments/[id]/lots", methods: ["GET", "POST"] },
    { segment: "api/admin/shipments/[id]/lots/[lotId]", methods: ["GET", "PATCH", "DELETE"] },
    { segment: "api/admin/shipments/[id]/lots/[lotId]/items", methods: ["GET", "POST"] },
    { segment: "api/admin/shipments/[id]/lots/[lotId]/items/bulk", methods: ["POST"] },
    { segment: "api/admin/shipments/[id]/lots/[lotId]/items/[itemId]", methods: ["PATCH", "DELETE"] },
    { segment: "api/admin/shipments/[id]/lots/[lotId]/items/[itemId]/link", methods: ["POST"] },
    { segment: "api/admin/shipments/projections", methods: ["GET"] },
  ],
};
