import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ThemeManagerView, type ThemeManagerValue } from "../ThemeManagerView";
import {
  BUILT_IN_THEMES,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
} from "../../../../tokens/themes";

const EMPTY_VALUE: ThemeManagerValue = {
  themes: [],
  defaultLightThemeId: DEFAULT_LIGHT_THEME.id,
  defaultDarkThemeId: DEFAULT_DARK_THEME.id,
};

describe("ThemeManagerView", () => {
  it("lists both built-in theme records", () => {
    render(<ThemeManagerView value={EMPTY_VALUE} onChange={() => undefined} />);
    for (const theme of BUILT_IN_THEMES) {
      expect(screen.getByText(theme.name)).not.toBeNull();
    }
  });

  it("flags built-in themes as undeletable", () => {
    render(<ThemeManagerView value={EMPTY_VALUE} onChange={() => undefined} />);
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/ });
    // Both built-ins should expose disabled delete buttons.
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
    for (const btn of deleteButtons) {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("emits an onChange with the admin record when saving a new draft", () => {
    const onChange = vi.fn();
    render(<ThemeManagerView value={EMPTY_VALUE} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /\+ New light theme/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Save theme$/ }));
    expect(onChange).toHaveBeenCalledOnce();
    const next = onChange.mock.calls[0][0] as ThemeManagerValue;
    expect(next.themes.length).toBe(1);
    expect(next.themes[0].mode).toBe("light");
  });
});
