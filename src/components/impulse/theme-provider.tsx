"use client";

import { useEffect, useState, useCallback } from "react";
import type { ThemeName, ColorMode } from "@/types/db";

const DEFAULT_THEME: ThemeName = "violet";
const DEFAULT_MODE: ColorMode = "dark";
const STORAGE_KEY = "impulse-theme";

interface ThemeState {
  theme: ThemeName;
  mode: ColorMode;
}

function applyTheme(theme: ThemeName, mode: ColorMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-mode", mode);
  root.style.colorScheme = mode;
}

function readStored(): ThemeState {
  if (typeof window === "undefined") return { theme: DEFAULT_THEME, mode: DEFAULT_MODE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemeState>;
      return {
        theme: (parsed.theme as ThemeName) || DEFAULT_THEME,
        mode: (parsed.mode as ColorMode) || DEFAULT_MODE,
      };
    }
  } catch {
    
  }
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return { theme: DEFAULT_THEME, mode: prefersDark ? "dark" : "light" };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ThemeState>({
    theme: DEFAULT_THEME,
    mode: DEFAULT_MODE,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStored();
    
    setState(stored);
    applyTheme(stored.theme, stored.mode);
    setHydrated(true);
  }, []);

  const setTheme = useCallback(
    (theme: ThemeName) => {
      setState((prev) => {
        const next = { ...prev, theme };
        applyTheme(next.theme, next.mode);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          
        }
        return next;
      });
    },
    []
  );

  const setMode = useCallback(
    (mode: ColorMode) => {
      setState((prev) => {
        const next = { ...prev, mode };
        applyTheme(next.theme, next.mode);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          
        }
        return next;
      });
    },
    []
  );

  const setAll = useCallback((theme: ThemeName, mode: ColorMode) => {
    applyTheme(theme, mode);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, mode }));
    } catch {
      
    }
    setState({ theme, mode });
  }, []);

  return (
    <ThemeContext.Provider value={{ ...state, hydrated, setTheme, setMode, setAll }}>
      {children}
    </ThemeContext.Provider>
  );
}

import { createContext, useContext } from "react";

interface ThemeContextValue extends ThemeState {
  hydrated: boolean;
  setTheme: (t: ThemeName) => void;
  setMode: (m: ColorMode) => void;
  setAll: (t: ThemeName, m: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: DEFAULT_THEME,
      mode: DEFAULT_MODE,
      hydrated: false,
      setTheme: () => {},
      setMode: () => {},
      setAll: () => {},
    };
  }
  return ctx;
}
