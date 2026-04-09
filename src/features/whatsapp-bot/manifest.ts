import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "whatsappBot",
  i18nNamespace: "whatsappBot",
  envKeys: [
    "WHATSAPP_BOT_NUMBER",
    "WHATSAPP_WEBHOOK_SECRET",
  ],
  routes: [],
  apiRoutes: [
    { segment: "api/whatsapp/webhook", methods: ["POST"] },
    { segment: "api/whatsapp/send-status", methods: ["POST"] },
  ],
};
