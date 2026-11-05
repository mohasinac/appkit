// Shared className constants for guide view components.
//
// 🛑 `iconBg` was a hardcoded gradient (owner's direct correction,
// 2026-11-05: 11+ guide pages each showing an identically-gradiented icon
// chip reads as decoration repeated everywhere, not a deliberate accent).
// One flat, theme-safe tint now — `--appkit-color-border-subtle` already
// inverts correctly per `[data-theme]`, same token `surface="subtle"`
// resolves to elsewhere, so there is no separate light/dark color choice
// to go wrong in one theme and not the other.
export const GC = {
  sectionWrap: "rounded-2xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden",
  sectionHeader: "flex items-center gap-3 px-6 py-4 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20",
  sectionBody: "px-6 py-5",
  iconPrimary: "w-5 h-5 text-[var(--appkit-color-primary)]",
  iconPrimarySm: "w-4 h-4 text-[var(--appkit-color-primary)]",
  sectionTitle: "text-base font-semibold text-[var(--appkit-color-text)]",
  listMuted: "space-y-2 text-sm text-[var(--appkit-color-text-muted)]",
  listDiscMuted: "list-disc list-inside space-y-1 text-sm text-[var(--appkit-color-text-muted)]",
  textMuted: "text-sm text-[var(--appkit-color-text-muted)]",
  textStrong: "text-[var(--appkit-color-text)]",
  code: "text-xs bg-[var(--appkit-color-border)] px-1 py-0.5 rounded",
  iconBg: "bg-[var(--appkit-color-border-subtle)]",
};
