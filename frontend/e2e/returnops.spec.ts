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
    const expectedColdStart =
      response.url().includes("/api/platform-health") &&
      response.status() === 503;
    if (
      response.url().includes("/api/") &&
      response.status() >= 500 &&
      !expectedColdStart
    ) {
      errors.push("api: " + response.status() + " " + response.url());
    }
  });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page), "The browser or API emitted unexpected errors").toEqual([]);
});

test("a cold backend shows progress and continues automatically", async ({
  page,
}) => {
  let healthChecks = 0;
  await page.route("**/api/platform-health", async (route) => {
    healthChecks += 1;
    const healthy = healthChecks > 1;
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        service: "returnops-api",
        status: healthy ? "ok" : "unavailable",
        database: healthy ? "ok" : "unavailable",
      }),
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("status").filter({ hasText: "The free demo is waking up" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Start a return" })).toBeEnabled({
    timeout: 10_000,
  });
  expect(healthChecks).toBeGreaterThanOrEqual(2);
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

async function expandOperationsRequest(page: Page, reference: string) {
  const search = page.getByPlaceholder("Search reference or customer");
  const filteredQueueResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.endsWith("/api/v1/operations/returns/") &&
      url.searchParams.get("search") === reference &&
      response.request().method() === "GET"
    );
  });
  await search.fill(reference);
  await filteredQueueResponse;

  if ((page.viewportSize()?.width ?? 1440) <= 760) {
    const card = page.getByRole("article").filter({ hasText: reference }).first();
    await expect(card).toBeVisible();
    const toggle = card.locator('button[aria-expanded="false"], button[aria-expanded="true"]').first();
    if ((await toggle.getAttribute("aria-expanded")) !== "true") {
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(card.getByRole("button", { name: /Open full request/ })).toBeVisible();
    return card;
  }

  const rowToggle = page.getByRole("button", { name: reference, exact: true });
  await expect(rowToggle).toBeVisible();
  if ((await rowToggle.getAttribute("aria-expanded")) !== "true") {
    await rowToggle.click();
  }
  await expect(rowToggle).toHaveAttribute("aria-expanded", "true");
  const expandedRow = rowToggle.locator("xpath=ancestor::tr/following-sibling::tr[1]");
  await expect(expandedRow.getByRole("button", { name: /Open full request/ })).toBeVisible();
  return expandedRow;
}

async function openOperationsReview(page: Page, reference: string) {
  const expandedRequest = await expandOperationsRequest(page, reference);
  await expandedRequest.getByRole("button", { name: /Open full request/ }).click();
  const review = page.getByRole("dialog", { name: reference });
  await expect(review).toBeVisible();
  return review;
}

async function openReturnCatalog(page: Page) {
  await page.getByRole("button", { name: "Start a return" }).click();
  const editor = page.getByRole("dialog", { name: "Start a fictional return" });
  await expect(editor).toBeVisible();
  return editor;
}

async function startWorkflowFromCatalog(page: Page) {
  const editor = page.getByRole("dialog", { name: "Start a fictional return" });
  await editor.getByRole("button", { name: /ORD-90001/ }).click();
  await editor.getByRole("checkbox", { name: /Adjustable monitor arm/ }).check();
  await editor.getByLabel("Optional details").fill("Fictional arm joint damage.");
  await editor.getByRole("button", { name: "Continue with selected items" }).click();
  const workflow = page.getByRole("dialog", { name: "New return" });
  await expect(
    workflow.getByRole("heading", { name: "Which items are you returning?" }),
  ).toBeVisible();
  return workflow;
}

async function expectVisualBaseline(
  page: Page,
  name: string,
  {
    fullPage = true,
    maskMobileQueue = false,
    maxDiffPixelRatio = 0.001,
  }: {
    fullPage?: boolean;
    maskMobileQueue?: boolean;
    maxDiffPixelRatio?: number;
  } = {},
) {
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
  await page.locator("tbody td:nth-child(6)").evaluateAll((cells) => {
    for (const cell of cells) cell.textContent = "Just now";
  });
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const customerWorkflow = page.getByRole("dialog", {
    name: /^(New return|Nueva devolución)$/,
  });
  const customerWorkflowVisible = await customerWorkflow.isVisible();
  if (customerWorkflowVisible) {
    await customerWorkflow.evaluate((dialog) => {
      window.scrollTo(0, 0);
      dialog.scrollTo(0, 0);
      let ancestor = dialog.parentElement;
      while (ancestor) {
        ancestor.scrollTo(0, 0);
        ancestor = ancestor.parentElement;
      }
      dialog.parentElement?.setAttribute(
        "data-visual-baseline",
        "customer-workflow",
      );
    });
    await page.addStyleTag({
      content:
        '[data-visual-baseline="customer-workflow"] {' +
        "background: #4b5a57 !important; " +
        "backdrop-filter: none !important; }",
    });
  }

  const mask = customerWorkflowVisible
    ? []
    : [
        page.locator("time, tbody td:nth-child(6)"),
        page
          .getByRole("dialog")
          .locator("dl")
          .first()
          .locator(":scope > div")
          .nth(3)
          .locator("dd"),
        page.getByRole("dialog").locator("li small"),
      ];
  if (maskMobileQueue) {
    mask.push(page.locator("article button small"));
  }
  await expect(page).toHaveScreenshot(name, {
    fullPage,
    mask,
    maskColor: "#d6dedb",
    maxDiffPixelRatio,
  });
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

test("accessibility contract — semantics, state, and modal focus", async ({ page }) => {
  await openCustomerDemo(page);

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("main")).toHaveCount(1);

  const language = page.getByRole("group", { name: "Language" });
  await expect(language.getByRole("button", { name: "EN" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(language.getByRole("button", { name: "ES" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  const startReturn = page.getByRole("button", { name: "Start a return" });
  await startReturn.click();
  const editor = page.getByRole("dialog", { name: "Start a fictional return" });
  const orderSearch = editor.getByLabel("Find a fictional demo order");
  await expect(orderSearch).toBeFocused();

  await editor.getByRole("button", { name: "Cancel" }).focus();
  await page.keyboard.press("Tab");
  await expect(editor.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(editor).not.toBeVisible();
  await expect(startReturn).toBeFocused();

  await switchToOperations(page);
  const submittedFilter = page
    .getByRole("region", { name: "Return status summary" })
    .getByRole("button", { name: /Submitted/ });
  await expect(submittedFilter).toHaveAttribute("aria-pressed", "false");
  await submittedFilter.click();
  await expect(submittedFilter).toHaveAttribute("aria-pressed", "true");

  const review = await openOperationsReview(page, "RTN-204");
  const closeReview = review.getByRole("button", { name: "Close full request" });
  await expect(closeReview).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(
    await review.evaluate((dialog) => dialog.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(review).not.toBeVisible();
  await expect(page.getByRole("button", { name: /Open full request/ })).toBeFocused();

  const unnamedButtons = await page.locator("button").evaluateAll((buttons) =>
    buttons.filter(
      (button) =>
        !button.getAttribute("aria-label") && !button.textContent?.trim(),
    ).length,
  );
  expect(unnamedButtons).toBe(0);
});

test("approved visual baselines — customer workflow desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCustomerDemo(page);
  await openReturnCatalog(page);
  await expectVisualBaseline(page, "customer-catalog-en-desktop.png", { fullPage: false });

  const workflow = await startWorkflowFromCatalog(page);
  await expectVisualBaseline(page, "customer-workflow-items-en-desktop.png", { fullPage: false });
  await workflow.getByRole("button", { name: /^Continue/ }).click();
  await workflow.getByRole("button", { name: /Attach sample/ }).first().click();
  await expect(workflow.getByRole("button", { name: /Attached/ })).toBeVisible();
  await expectVisualBaseline(page, "customer-workflow-evidence-en-desktop.png", { fullPage: false });
  await workflow.getByRole("button", { name: /^Continue/ }).click();
  await expect(workflow.getByRole("heading", { name: "Review your request" })).toBeVisible();
  await expectVisualBaseline(page, "customer-workflow-review-en-desktop.png", { fullPage: false });
});

test("approved visual baselines — customer modals mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCustomerDemo(page);
  await openReturnCatalog(page);
  await expectVisualBaseline(page, "customer-catalog-en-mobile.png", { fullPage: false });

  const workflow = await startWorkflowFromCatalog(page);
  await workflow.getByRole("button", { name: /^Continue/ }).click();
  await workflow.getByRole("button", { name: /Attach sample/ }).first().click();
  await workflow.getByRole("button", { name: /^Continue/ }).click();
  await expect(workflow.getByRole("heading", { name: "Review your request" })).toBeVisible();
  await expectVisualBaseline(page, "customer-workflow-review-en-mobile.png", {
    fullPage: false,
    maxDiffPixelRatio: 0.002,
  });
});

for (const scenario of [
  { name: "operations-queue-expanded-en-desktop", width: 1440, height: 1000 },
  { name: "operations-queue-expanded-en-mobile", width: 390, height: 844 },
] as const) {
  test("approved visual baseline — " + scenario.name, async ({ page }) => {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await openCustomerDemo(page);
    await switchToOperations(page);
    await expandOperationsRequest(page, "RTN-204");
    await expectVisualBaseline(page, scenario.name + ".png", {
      maskMobileQueue: scenario.width <= 760,
    });
  });
}

for (const scenario of [
  { name: "operations-review-submitted-en-desktop", reference: "RTN-204" },
  { name: "operations-review-needs-information-en-desktop", reference: "RTN-198" },
  { name: "operations-review-approved-en-desktop", reference: "RTN-191" },
  { name: "operations-review-rejected-en-desktop", reference: "RTN-187" },
] as const) {
  test("approved visual baseline — " + scenario.name, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openCustomerDemo(page);
    await switchToOperations(page);
    await openOperationsReview(page, scenario.reference);
    await expectVisualBaseline(page, scenario.name + ".png", { fullPage: false });
  });
}

test("approved visual baseline — operations decision confirmation mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCustomerDemo(page);
  await switchToOperations(page);
  const review = await openOperationsReview(page, "RTN-204");
  await review.getByRole("button", { name: /^Request information/ }).click();
  await review.getByLabel(/Decision note/).fill("Add fictional serial evidence.");
  await review.getByRole("button", { name: /Review decision/ }).click();
  const confirmDecision = review.getByRole("button", { name: "Confirm decision" });
  await expect(confirmDecision).toBeVisible();
  await confirmDecision.scrollIntoViewIfNeeded();
  await expect(confirmDecision).toBeInViewport();
  await expectVisualBaseline(page, "operations-confirmation-en-mobile.png", {
    fullPage: false,
    maskMobileQueue: true,
  });
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

    await expectVisualBaseline(page, scenario.name + ".png", {
      maskMobileQueue: scenario.width <= 760,
    });
  });
}
