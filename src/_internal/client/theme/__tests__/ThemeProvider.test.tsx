import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { ThemeProvider, useTheme } from "../ThemeProvider";
import { buildThemeRegistry } from "../buildRegistry";
import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
} from "../../../../tokens/themes";

const MEDIA_QUERY = "(prefers-color-scheme: dark)";

function mockMatchMedia(prefersDark: boolean) {
  const listeners: Array<(event: MediaQueryListEvent) => void> = [];
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query === MEDIA_QUERY ? prefersDark : false,
      media: query,
      onchange: null,
      addEventListener: (
        _event: string,
        cb: (event: MediaQueryListEvent) => void,
      ) => listeners.push(cb),
      removeEventListener: (
        _event: string,
        cb: (event: MediaQueryListEvent) => void,
      ) => {
        const idx = listeners.indexOf(cb);
        if (idx !== -1) listeners.splice(idx, 1);
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => true,
    }),
  });
  return listeners;
}

function Probe() {
  const { effectiveMode, activeTheme, preference } = useTheme();
  return (
    <div data-testid="probe">
      mode={effectiveMode} pref={preference} themeId={activeTheme.id}
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
  });

  it("applies the default light theme when prefers-color-scheme is light", () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toContain(
      `themeId=${DEFAULT_LIGHT_THEME.id}`,
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      DEFAULT_LIGHT_THEME.id,
    );
  });

  it("applies the default dark theme when prefers-color-scheme is dark", () => {
    mockMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toContain(
      `themeId=${DEFAULT_DARK_THEME.id}`,
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("toggleTheme flips preference between light and dark", () => {
    mockMatchMedia(false);
    let captured: ReturnType<typeof useTheme> | null = null;
    function Capture() {
      captured = useTheme();
      return null;
    }
    render(
      <ThemeProvider>
        <Capture />
      </ThemeProvider>,
    );
    expect(captured?.effectiveMode).toBe("light");
    act(() => captured?.toggleTheme());
    expect(captured?.effectiveMode).toBe("dark");
    expect(captured?.preference).toBe("dark");
  });

  it("writes inline CSS variables from the active theme to <html>", () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(
      document.documentElement.style.getPropertyValue("--appkit-color-primary"),
    ).toBe(DEFAULT_LIGHT_THEME.tokens["appkit-color-primary"]);
  });

  it("buildThemeRegistry falls back to built-ins for missing ids", () => {
    const registry = buildThemeRegistry({
      themes: [],
      defaultLightThemeId: "missing",
      defaultDarkThemeId: "missing-too",
    });
    expect(registry.defaultLightThemeId).toBe(DEFAULT_LIGHT_THEME.id);
    expect(registry.defaultDarkThemeId).toBe(DEFAULT_DARK_THEME.id);
  });

  it("buildThemeRegistry merges admin records with built-ins", () => {
    const adminTheme = {
      id: "sunset-bright",
      name: "Sunset Bright",
      mode: "light" as const,
      builtIn: false,
      tokens: { "appkit-color-primary": "#ff9900" },
      gradients: {} as Record<string, string>,
    };
    const registry = buildThemeRegistry({
      themes: [adminTheme],
      defaultLightThemeId: "sunset-bright",
      defaultDarkThemeId: DEFAULT_DARK_THEME.id,
    });
    expect(registry.defaultLightThemeId).toBe("sunset-bright");
    expect(registry.themes.find((t) => t.id === "sunset-bright")).toBeDefined();
    expect(registry.themes.find((t) => t.id === DEFAULT_LIGHT_THEME.id)).toBeDefined();
  });

  it("useTheme throws outside the provider", () => {
    // Suppress the expected console.error from React.
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    function Naked() {
      useTheme();
      return null;
    }
    expect(() => render(<Naked />)).toThrow(/useTheme/);
    spy.mockRestore();
  });
});
