"use client"
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

export type ThemeMode = "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme";
const THEME_COOKIE_MAX_AGE = 31536000; // 1 year

function applyTheme(newTheme: ThemeMode): void {
  const root = document.documentElement;
  if (newTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.setAttribute("data-theme", newTheme);
}

function persistTheme(theme: ThemeMode): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function ThemeProvider({
  children,
  initialTheme = "light",
}: {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
}) {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    const savedTheme = localStorage.getItem(
      THEME_STORAGE_KEY,
    ) as ThemeMode | null;
    if (savedTheme) {
      if (savedTheme !== initialTheme) {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
        persistTheme(savedTheme);
      }
    } else {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      setThemeState(systemTheme);
      applyTheme(systemTheme);
      persistTheme(systemTheme);
    }
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    persistTheme(newTheme);
    applyTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const newTheme = prev === "light" ? "dark" : "light";
      persistTheme(newTheme);
      applyTheme(newTheme);
      return newTheme;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
