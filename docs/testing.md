# Testing ReturnOps

ReturnOps uses three complementary layers of automated verification.

## Domain and API integration

Run the Django suite against an isolated PostgreSQL test database:

```bash
docker compose exec backend python manage.py test -v 2
```

The focused customer-to-operations lifecycle is:

```bash
docker compose exec backend \\
  python manage.py test \\
  returns.tests.test_api_views.ReturnAPIIntegrationTests.test_complete_customer_to_operations_flow \\
  -v 2
```

Neither command mutates the visitor data displayed by the running demo.

## Frontend unit and static checks

```bash
docker compose exec frontend npm test
docker compose exec frontend npm run lint
docker compose exec frontend npm run typecheck
```

Vitest covers the HTTP client, session bootstrap, API adapters, and pure workflow helpers.

The Django suite also covers the complete Energybil state machine, exact invoice
amounts, CSRF enforcement, idempotent completion, reset behavior, and isolation
between two browser sessions. The frontend unit suite covers the three
Energybil API commands.

## Browser end-to-end tests

Playwright runs from WSL against the frontend, backend, and PostgreSQL services provided by Docker Compose. Keep the three services healthy before starting:

```bash
docker compose up -d
docker compose ps
```

Install the local browser once:

```bash
cd frontend
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
```

Run the complete browser suite:

```bash
npm run test:e2e
```

Run the focused accessibility contract while iterating on interface code:

```bash
npm run test:a11y
```

This check covers landmarks, language and selected-state semantics, modal focus
containment and restoration, and unnamed buttons. It complements ESLint and
does not replace the complete lifecycle or visual suite.

The lifecycle test creates a new isolated visitor, restores that visitor's fictional dataset, submits a return, requests information, resubmits it, approves it, and verifies the final five-event history. It never selects or submits a visitor UUID.

The responsive audit covers customer and operations screens at 1440px and 390px, in English and Spanish. Representative screenshots live in `frontend/e2e/visual-baselines`.

Use headed mode only for diagnosis:

```bash
npm run test:e2e:headed
```

Only update approved screenshots after intentionally reviewing a visual change:

```bash
npm run test:e2e:update
```

Failure traces, videos, and screenshots are written to ignored `test-results` and `playwright-report` directories.

The interface architecture and baseline policy are documented in the
[frontend interface system](frontend-interface-system.md).
