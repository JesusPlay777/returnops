import { expect, test } from "@playwright/test";

test.describe("Xmart live demo", () => {
  test("provisions the operator and synthetic device through the audit", async ({
    page,
  }) => {
    await page.goto("/xmart");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Provision a field team with every change accounted for.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Xmart home" })).toBeVisible();
    await expect(
      page.getByText("Interactive demo", { exact: true }),
    ).toBeVisible();

    const advance = page.getByRole("button", { name: "Run next stage" });
    await expect(advance).toBeEnabled({ timeout: 20_000 });

    for (const stage of [
      "User access",
      "Device assignment",
      "Security audit",
      "Complete",
    ]) {
      await advance.click();
      await expect(page.locator('[aria-current="step"]')).toContainText(stage);
    }

    await expect(
      page.getByRole("button", { name: "Workflow complete" }),
    ).toBeDisabled();
    await expect(page.getByText("5 / 10", { exact: true })).toBeVisible();
    await expect(page.getByText("9 / 15", { exact: true })).toBeVisible();

    const operator = page.getByRole("article").filter({
      hasText: "field.operator@example.test",
    });
    const device = page.getByRole("article").filter({
      hasText: "DEMO-IMEI-0001",
    });
    await expect(operator.getByText("Active", { exact: true })).toBeVisible();
    await expect(device.getByText("Assigned", { exact: true })).toBeVisible();

    const audit = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Immutable fictional activity" }),
    });
    await expect(audit.getByRole("listitem")).toHaveCount(6);

    await page.getByRole("button", { name: "Reset scenario" }).click();
    await expect(page.locator('[aria-current="step"]')).toContainText(
      "Customer workspace",
    );
    await expect(page.getByText("4 / 10", { exact: true })).toBeVisible();
    await expect(page.getByText("8 / 15", { exact: true })).toBeVisible();
  });

  test("keeps the bilingual mobile interface within the viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/xmart");
    await expect(
      page.getByRole("button", { name: "Run next stage" }),
    ).toBeEnabled({ timeout: 20_000 });

    await page.getByRole("button", { name: "ES", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Aprovisiona un equipo de campo con cada cambio registrado.",
      }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(
      page.getByText("Demo interactiva", { exact: true }),
    ).toHaveText("Demo interactiva");

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("isolates the workspace between regular and private sessions", async ({
    browser,
  }) => {
    const regularContext = await browser.newContext();
    const privateContext = await browser.newContext();

    try {
      const regularPage = await regularContext.newPage();
      await regularPage.goto("/xmart");
      const advance = regularPage.getByRole("button", {
        name: "Run next stage",
      });
      await expect(advance).toBeEnabled({ timeout: 20_000 });
      await advance.click();
      await expect(
        regularPage.locator('[aria-current="step"]'),
      ).toContainText("User access");
      await expect(
        regularPage.getByText("5 / 10", { exact: true }),
      ).toBeVisible();

      const privatePage = await privateContext.newPage();
      await privatePage.goto("/xmart");
      await expect(
        privatePage.getByRole("button", { name: "Run next stage" }),
      ).toBeEnabled({ timeout: 20_000 });
      await expect(
        privatePage.locator('[aria-current="step"]'),
      ).toContainText("Customer workspace");
      await expect(
        privatePage.getByText("4 / 10", { exact: true }),
      ).toBeVisible();

      await expect(
        regularPage.locator('[aria-current="step"]'),
      ).toContainText("User access");
      await expect(
        regularPage.getByText("5 / 10", { exact: true }),
      ).toBeVisible();
    } finally {
      await regularContext.close();
      await privateContext.close();
    }
  });
});
