import type { FeatureManifest } from "../../contracts";

export const manifest: FeatureManifest = {
  name: "auth",
  i18nNamespace: "auth",
  envKeys: [],
  routes: [
    { segment: "[locale]/auth/login", exports: { default: "LoginView" } },
    { segment: "[locale]/auth/register", exports: { default: "RegisterView" } },
    {
      segment: "[locale]/auth/forgot-password",
      exports: { default: "ForgotPasswordView" },
    },
    {
      segment: "[locale]/auth/reset-password",
      exports: { default: "ResetPasswordView" },
    },
  ],
  apiRoutes: [
    { segment: "api/auth/me", methods: ["GET"] },
    { segment: "api/auth/session", methods: ["POST", "DELETE"] },
  ],
};
