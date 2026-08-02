"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "siemc-theme";

function getDocumentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = (event: MediaQueryListEvent) => {
      if (localStorage.getItem(THEME_STORAGE_KEY) === null) {
        const nextTheme = event.matches ? "dark" : "light";
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }
    };
    const syncStoredTheme = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      const storedTheme = event.newValue;
      const nextTheme: Theme =
        storedTheme === "light" || storedTheme === "dark"
          ? storedTheme
          : mediaQuery.matches
            ? "dark"
            : "light";

      applyTheme(nextTheme);
      setTheme(nextTheme);
    };

    const initialSync = window.setTimeout(
      () => setTheme(getDocumentTheme()),
      0,
    );
    mediaQuery.addEventListener("change", syncSystemTheme);
    window.addEventListener("storage", syncStoredTheme);

    return () => {
      window.clearTimeout(initialSync);
      mediaQuery.removeEventListener("change", syncSystemTheme);
      window.removeEventListener("storage", syncStoredTheme);
    };
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = theme
    ? `Cambiar a tema ${nextTheme === "dark" ? "oscuro" : "claro"}`
    : "Cambiar tema de color";

  const toggleTheme = () => {
    const newTheme: Theme =
      getDocumentTheme() === "dark" ? "light" : "dark";

    applyTheme(newTheme);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // The visual change still works when storage is unavailable.
    }

    setTheme(newTheme);
  };

  return (
    <button
      aria-label={label}
      className="theme-toggle"
      onClick={toggleTheme}
      title={label}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="theme-toggle__icon theme-toggle__icon--moon"
        viewBox="0 0 24 24"
      >
        <path d="M20 15.1A8.3 8.3 0 0 1 8.9 4a8.4 8.4 0 1 0 11.1 11.1Z" />
      </svg>
      <svg
        aria-hidden="true"
        className="theme-toggle__icon theme-toggle__icon--sun"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
