export const THEME_STORAGE_KEY = "returnops-theme";

export type Theme = "light" | "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function resolveThemePreference({
  queryTheme,
  storedTheme,
  prefersDark,
}: {
  queryTheme: string | null;
  storedTheme: string | null;
  prefersDark: boolean;
}): Theme {
  if (isTheme(queryTheme)) {
    return queryTheme;
  }

  if (isTheme(storedTheme)) {
    return storedTheme;
  }

  return prefersDark ? "dark" : "light";
}

export const themeInitializationScript = `
(() => {
  const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  const isTheme = (value) => value === "light" || value === "dark";
  const queryTheme = new URLSearchParams(window.location.search).get("theme");
  let storedTheme = null;

  try {
    storedTheme = window.localStorage.getItem(storageKey);
  } catch {}

  const theme = isTheme(queryTheme)
    ? queryTheme
    : isTheme(storedTheme)
      ? storedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  if (isTheme(queryTheme)) {
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {}
  }
})();
`;
