import { describe, expect, it } from "vitest";

import { isTheme, resolveThemePreference } from "@/lib/theme";

describe("theme preference", () => {
  it("recognizes only supported theme names", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("gives an explicit query parameter the highest priority", () => {
    expect(
      resolveThemePreference({
        queryTheme: "dark",
        storedTheme: "light",
        prefersDark: false,
      }),
    ).toBe("dark");
  });

  it("uses a saved preference when the query parameter is absent or invalid", () => {
    expect(
      resolveThemePreference({
        queryTheme: null,
        storedTheme: "dark",
        prefersDark: false,
      }),
    ).toBe("dark");
    expect(
      resolveThemePreference({
        queryTheme: "sepia",
        storedTheme: "light",
        prefersDark: true,
      }),
    ).toBe("light");
  });

  it("falls back to the operating-system preference", () => {
    expect(
      resolveThemePreference({
        queryTheme: null,
        storedTheme: null,
        prefersDark: true,
      }),
    ).toBe("dark");
    expect(
      resolveThemePreference({
        queryTheme: null,
        storedTheme: null,
        prefersDark: false,
      }),
    ).toBe("light");
  });
});
