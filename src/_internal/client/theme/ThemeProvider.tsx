"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  BUILT_IN_THEMES,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  type ThemeMode,
  type ThemeRecord,
} from "../../../tokens/themes";

// Brand-neutral localStorage namespace so consumers other than letitrip can
// adopt appkit without the key leaking the LetItRip brand. The audit
// audit-ssr-in-appkit blocks any hardcoded brand string inside `_internal/`.
const MODE_STORAGE_KEY = "appkit:theme-mode";
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export type ModePreference = "light" | "dark" | "auto";

export interface ThemeRegistry {
  /** Built-ins + admin-created themes, indexed by id. */
  themes: ReadonlyArray<ThemeRecord>;
  /** Theme id used when effective mode is `"light"`. */
  defaultLightThemeId: string;
  /** Theme id used when effective mode is `"dark"`. */
  defaultDarkThemeId: string;
}

export interface ThemeContextValue {
  /** The theme record currently applied to `<html>`. */
  activeTheme: ThemeRecord;
  /** Effective mode after auto-resolution (`"light"` | `"dark"`). */
  effectiveMode: ThemeMode;
  /** Alias for `effectiveMode` — convenience for consumers that just need the mode. */
  theme: ThemeMode;
  /** User's stored preference (`"light"` | `"dark"` | `"auto"`). */
  preference: ModePreference;
  /** Persist a new mode preference and re-render the active theme. */
  setPreference: (next: ModePreference) => void;
  /** Set preference directly to a concrete mode (skips `"auto"`). */
  setTheme: (mode: ThemeMode) => void;
  /** Flip preference between light ↔ dark. Sets preference to a concrete mode. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readModePreference(): ModePreference {
  if (typeof window === "undefined") return "auto";
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "auto") return stored;
  } catch {
    /* localStorage may be unavailable (privacy mode, embedded iframe). */
  }
  return "auto";
}

function resolveEffectiveMode(preference: ModePreference): ThemeMode {
  if (preference === "light" || preference === "dark") return preference;
  if (typeof window === "undefined") return "light";
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

function pickTheme(registry: ThemeRegistry, mode: ThemeMode): ThemeRecord {
  const wanted = mode === "dark" ? registry.defaultDarkThemeId : registry.defaultLightThemeId;
  const hit = registry.themes.find((t) => t.id === wanted);
  if (hit && hit.mode === mode) return hit;
  // Fall back to the matching built-in if the configured id is missing or
  // its mode mismatches (e.g. admin pointed defaultLightThemeId at a dark theme).
  return mode === "dark" ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
}

/** Apply a theme record to `<html>` by setting `data-theme` and inline CSS variables. */
function applyTheme(theme: ThemeRecord): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme.id);
  // Mode class kept in sync for any legacy `.dark` selectors that still exist.
  if (theme.mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");

  for (const [name, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(`--${name}`, value);
  }
  for (const [key, value] of Object.entries(theme.gradients)) {
    root.style.setProperty(`--appkit-gradient-${key}`, value);
  }
}

export interface ThemeProviderProps {
  /**
   * Theme registry — typically `{ themes: [...BUILT_IN_THEMES, ...siteSettings.theme.themes],
   * defaultLightThemeId, defaultDarkThemeId }`.
   *
   * If omitted, ships with just the two built-ins.
   */
  registry?: ThemeRegistry;
  children: ReactNode;
}

const FALLBACK_REGISTRY: ThemeRegistry = {
  themes: BUILT_IN_THEMES,
  defaultLightThemeId: DEFAULT_LIGHT_THEME.id,
  defaultDarkThemeId: DEFAULT_DARK_THEME.id,
};

export function ThemeProvider({ registry, children }: ThemeProviderProps) {
  const effectiveRegistry = registry ?? FALLBACK_REGISTRY;

  const [preference, setPreferenceState] = useState<ModePreference>(readModePreference);
  const [effectiveMode, setEffectiveMode] = useState<ThemeMode>(() =>
    resolveEffectiveMode(preference),
  );

  // Subscribe to `prefers-color-scheme` so `"auto"` follows the OS in real time.
  useEffect(() => {
    if (typeof window === "undefined" || preference !== "auto") return;
    const media = window.matchMedia(DARK_MEDIA_QUERY);
    const onChange = () => setEffectiveMode(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  // Recompute effective mode whenever preference changes.
  useEffect(() => {
    setEffectiveMode(resolveEffectiveMode(preference));
  }, [preference]);

  // Apply the active theme to the DOM whenever it changes.
  const activeTheme = useMemo(
    () => pickTheme(effectiveRegistry, effectiveMode),
    [effectiveRegistry, effectiveMode],
  );
  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  const setPreference = useCallback((next: ModePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      /* ignore; preference applies for the session at minimum. */
    }
  }, []);

  const setTheme = useCallback(
    (mode: ThemeMode) => setPreference(mode),
    [setPreference],
  );
  const toggleTheme = useCallback(() => {
    setPreference(effectiveMode === "dark" ? "light" : "dark");
  }, [effectiveMode, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      activeTheme,
      effectiveMode,
      theme: effectiveMode,
      preference,
      setPreference,
      setTheme,
      toggleTheme,
    }),
    [activeTheme, effectiveMode, preference, setPreference, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
