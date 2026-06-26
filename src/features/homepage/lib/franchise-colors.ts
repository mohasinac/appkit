/**
 * Hex colour defaults for franchise/brand accent pickers.
 * These must be literal hex strings because <input type="color"> does not
 * accept CSS custom properties. This file is the single source of truth so
 * the audit-hex-tokens script can exempt it rather than flagging call sites.
 */
export const DEFAULT_ACCENT_HEX = "#E8001C"; // Marvel red — sensible default for new hotspot pins
