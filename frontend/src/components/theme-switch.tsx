"use client";

import { useTheme } from "@/providers/theme-provider";

type Locale = "en" | "es";
type ThemeSwitchVariant = "customer" | "operations";

const copy = {
  en: {
    group: "Color theme",
    light: "Use light theme",
    dark: "Use dark theme",
  },
  es: {
    group: "Tema de color",
    light: "Usar tema claro",
    dark: "Usar tema oscuro",
  },
} as const;

function SunIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function ThemeSwitch({
  locale,
  variant,
}: {
  locale: Locale;
  variant: ThemeSwitchVariant;
}) {
  const { theme, setTheme } = useTheme();
  const labels = copy[locale];

  return (
    <div
      aria-label={labels.group}
      className={`theme-switch theme-switch--${variant}`}
      role="group"
    >
      <button
        aria-label={labels.light}
        aria-pressed={theme === "light"}
        onClick={() => setTheme("light")}
        title={labels.light}
        type="button"
      >
        <SunIcon />
      </button>
      <button
        aria-label={labels.dark}
        aria-pressed={theme === "dark"}
        onClick={() => setTheme("dark")}
        title={labels.dark}
        type="button"
      >
        <MoonIcon />
      </button>
    </div>
  );
}
