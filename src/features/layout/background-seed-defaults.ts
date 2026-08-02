// Seed defaults for siteSettings.theme.background — Firestore data values, not CSS styling.
// These are the first-boot theme configuration and are exempt from the hex-tokens audit.
// Override via the admin theme editor (Site Settings → Themes).
export const SEED_LIGHT_BG = {
  type: "color" as const,
  value: "#f9fafb",
  overlay: { enabled: false, color: "#000000", opacity: 0 },
};

export const SEED_DARK_BG = {
  type: "color" as const,
  value: "#030712",
  overlay: { enabled: false, color: "#000000", opacity: 0 },
};

export const OVERLAY_FALLBACK_COLOR = "#000000";
