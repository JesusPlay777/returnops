import { expect, test } from "@playwright/test";

test.describe("color theme", () => {
  test("accepts a portfolio handoff and persists the visitor preference", async ({
    page,
  }) => {
    await page.goto("/xmart?theme=dark");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(
      page.getByRole("button", { name: "Use dark theme" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem("returnops-theme")),
      )
      .toBe("dark");

    await page.goto("/energybil");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: "Use light theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem("returnops-theme")),
      )
      .toBe("light");
  });

  test("keeps theme controls inside a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/?theme=dark");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(
      page.getByRole("button", { name: "Use light theme" }).first(),
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
