import { expect, type Page, test } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();
const createdReference = "RTN-205";

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error") errors.push("console: " + message.text());
  });
  page.on("pageerror", (error) => errors.push("page: " + error.message));
  page.on("response", (response) => {
    if (response.url().includes("/api/") && response.status() >= 500) {
      errors.push("api: " + response.status() + " " + response.url());
    }
  });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page), "The browser or API emitted unexpected errors").toEqual([]);
});

async function openCustomerDemo(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Returns, without the runaround." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Start a return" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "RTN-204", exact: true })).toBeVisible();
}

async function switchToOperations(page: Page) {
  await page.getByRole("button", { name: "Operations", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Return requests" }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Search reference or customer")).toBeVisible();
}

async function switchToCustomer(page: Page) {
  await page.getByRole("button", { name: "Customer view", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Returns, without the runaround." }),
  ).toBeVisible();
}

async function openOperationsReview(page: Page, reference: string) {
  const search = page.getByPlaceholder("Search reference or customer");
  await search.fill(reference);
  const rowToggle = page.getByRole("button", { name: reference, exact: true });
  await expect(rowToggle).toBeVisible();
  if ((await rowToggle.getAttribute("aria-expanded")) !== "true") {
    await rowToggle.click();
  }
  await rowToggle
    .locator("xpath=ancestor::tr/following-sibling::tr[1]")
    .getByRole("button", { name: /Open full request/ })
    .click();
  const review = page.getByRole("dialog", { name: reference });
  await expect(review).toBeVisible();
  return review;
}

async function recordOperationsDecision(
  page: Page,
  reference: string,
  decision: "Request information" | "Approve return",
  note?: string,
) {
  const review = await openOperationsReview(page, reference);
  await review.getByRole("button", { name: new RegExp("^" + decision) }).click();
  if (note) await review.getByLabel(/Decision note/).fill(note);
  await review.getByRole("button", { name: /Review decision/ }).click();
  await review.getByRole("button", { name: "Confirm decision" }).click();
  return review;
}

test("customer and operations complete the full return lifecycle", async ({ page }) => {
  await openCustomerDemo(page);
  await switchToOperations(page);
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Demo data restored" }),
  ).toBeVisible();
  await switchToCustomer(page);

  await page.getByRole("button", { name: "Start a return" }).click();
  const editor = page.getByRole("dialog", { name: "Start a fictional return" });
  await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: /ORD-90001/ }).click();
  await editor.getByRole("checkbox", { name: /Adjustable monitor arm/ }).check();
  await editor.getByLabel("Optional details").fill("Fictional arm joint damage.");
  await editor.getByRole("button", { name: "Continue with selected items" }).click();

  let workflow = page.getByRole("dialog", { name: "New return" });
  await expect(
    workflow.getByRole("heading", { name: "Which items are you returning?" }),
  ).toBeVisible();
  await workflow.getByRole("button", { name: /^Continue/ }).click();
  await expect(
    workflow.getByRole("heading", { name: "Add supporting evidence" }),
  ).toBeVisible();
  await workflow.getByRole("button", { name: /Attach sample/ }).first().click();
  await expect(workflow.getByRole("button", { name: /Attached/ })).toBeVisible();
  await workflow.getByRole("button", { name: /^Continue/ }).click();
  await expect(workflow.getByRole("heading", { name: "Review your request" })).toBeVisible();
  await workflow
    .getByRole("checkbox", { name: /I confirm this is a fictional demonstration/ })
    .check();
  await workflow.getByRole("button", { name: "Submit request" }).click();
  await expect(workflow).not.toBeVisible();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Return submitted to operations" }),
  ).toBeVisible();

  await switchToOperations(page);
  let review = await recordOperationsDecision(
    page,
    createdReference,
    "Request information",
    "Add fictional serial evidence.",
  );
  await expect(review.getByRole("heading", { name: "Needs information" })).toBeVisible();
  await review.getByRole("button", { name: "Close full request" }).click();

  await switchToCustomer(page);
  await page.getByRole("button", { name: createdReference, exact: true }).click();
  const detail = page.locator("#return-detail");
  await expect(detail).toContainText("Needs information");
  await detail.getByRole("button", { name: "Continue return" }).click();

  workflow = page.getByRole("dialog", { name: "New return" });
  await workflow.getByRole("button", { name: /Evidence$/ }).click();
  await workflow.getByRole("button", { name: /Attach sample/ }).first().click();
  await workflow.getByRole("button", { name: /^Continue/ }).click();
  await workflow
    .getByLabel(/Response for operations/)
    .fill("Added the requested fictional serial evidence.");
  await workflow
    .getByRole("checkbox", { name: /I confirm this is a fictional demonstration/ })
    .check();
  await workflow.getByRole("button", { name: "Resubmit request" }).click();
  await expect(workflow).not.toBeVisible();

  await switchToOperations(page);
  review = await recordOperationsDecision(page, createdReference, "Approve return");
  await expect(review.getByRole("heading", { name: "Approved" })).toBeVisible();
  await review.getByRole("button", { name: "Close full request" }).click();

  await switchToCustomer(page);
  await page.getByRole("button", { name: createdReference, exact: true }).click();
  await expect(page.locator("#return-detail")).toContainText("Approved");
  await expect(page.locator("#return-detail").getByRole("listitem")).toHaveCount(5);
});

test("dialogs can be dismissed with the keyboard", async ({ page }) => {
  await openCustomerDemo(page);
  await page.getByRole("button", { name: "Start a return" }).click();
  const editor = page.getByRole("dialog", { name: "Start a fictional return" });
  await expect(editor).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(editor).not.toBeVisible();
  await switchToOperations(page);
  const review = await openOperationsReview(page, "RTN-204");
  await page.keyboard.press("Escape");
  await expect(review).not.toBeVisible();
});

const visualScenarios = [
  { name: "customer-en-desktop", role: "customer", locale: "en", width: 1440, height: 1000 },
  {
    name: "operations-en-desktop",
    role: "operations",
    locale: "en",
    width: 1440,
    height: 1000,
  },
  { name: "customer-es-mobile", role: "customer", locale: "es", width: 390, height: 844 },
  {
    name: "operations-es-mobile",
    role: "operations",
    locale: "es",
    width: 390,
    height: 844,
  },
] as const;

for (const scenario of visualScenarios) {
  test("approved visual baseline — " + scenario.name, async ({ page }) => {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await openCustomerDemo(page);
    if (scenario.locale === "es") {
      await page.getByRole("button", { name: "ES", exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", "es");
    }
    if (scenario.role === "operations") {
      await page
        .getByRole("button", {
          name: scenario.locale === "es" ? "Operaciones" : "Operations",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("heading", {
          level: 1,
          name:
            scenario.locale === "es" ? "Solicitudes de devolución" : "Return requests",
        }),
      ).toBeVisible();
      const openRequestName =
        scenario.locale === "es"
          ? /Abrir solicitud completa/
          : /Open full request/;
      const openRequestButton =
        scenario.width <= 760
          ? page
              .getByRole("article")
              .filter({ hasText: "RTN-204" })
              .getByRole("button", { name: openRequestName })
          : page
              .getByRole("table")
              .getByRole("button", { name: openRequestName })
              .first();
      await expect(openRequestButton).toBeVisible();
    }

    await page.addStyleTag({
      content: "nextjs-portal { display: none !important; }",
    });

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page).toHaveScreenshot(scenario.name + ".png", {
      fullPage: true,
      mask: [page.locator("time, tbody td:nth-child(6), article button small")],
      maskColor: "#d6dedb",
    });
  });
}
