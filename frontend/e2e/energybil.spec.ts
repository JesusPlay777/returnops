import { expect, test } from "@playwright/test";


test.describe("Energybil live demo", () => {
  test("advances the isolated meter reading through the complete invoice", async ({
    page,
  }) => {
    await page.goto("/energybil");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Turn a meter pulse into an auditable invoice.",
      }),
    ).toBeVisible();
    const advance = page.getByRole("button", { name: "Run next stage" });
    await expect(advance).toBeEnabled({ timeout: 20_000 });

    for (const stage of [
      "Validation",
      "Consumption",
      "Invoice",
      "Notification",
    ]) {
      await advance.click();
      await expect(page.locator('[aria-current="step"]')).toContainText(stage);
    }

    await expect(
      page.getByRole("button", { name: "Workflow complete" }),
    ).toBeDisabled();
    await expect(page.getByText("$71.52", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Amount due: USD 71.52/),
    ).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(10);
  });

  test("keeps the bilingual mobile interface within the viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/energybil");
    await expect(
      page.getByRole("button", { name: "Run next stage" }),
    ).toBeEnabled({ timeout: 20_000 });

    await page.getByRole("button", { name: "es", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Convierte un pulso del medidor en una factura auditable.",
      }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
