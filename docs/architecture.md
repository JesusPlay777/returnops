# ReturnOps architecture

## Purpose

ReturnOps is an independent demonstration application for a returns workflow.
All people, products, evidence, identifiers, and operational data are
fictional. The implementation is clean-room and does not depend on the
original workplace application.

## Runtime topology

```text
Browser
  |
  | HTTP
  v
Next.js frontend :3000
  |
  | JSON API
  v
Django REST API :8000
  |
  | SQL
  v
PostgreSQL :5432
```

Docker Compose provides the same three-service topology for local development.
The services are independently deployable later, so the frontend, API, and
database can use different hosting providers without restructuring the code.

## Repository boundaries

```text
returnops/
├── frontend/       Next.js application and interface system
├── backend/        Django project, API, and domain modules
├── docs/           architecture and decision records
├── compose.yaml    local service orchestration
└── .env.example    documented configuration contract
```

The first domain module will be `returns`. The generated `core` Django app
contains only cross-cutting platform endpoints such as health checks.

## Configuration

Configuration is provided through environment variables. Secrets are never
committed. Compose includes explicit local defaults so a new contributor can
run the platform before creating a `.env` file.

The frontend receives only public browser configuration through
`NEXT_PUBLIC_*` variables. Django owns database credentials and application
secrets.

## Browser API boundary

The visitor workflow calls relative `/api/` paths through a small shared
browser client. Next.js rewrites those same-origin requests to the Django
origin supplied privately through `BACKEND_INTERNAL_URL`; the backend address
is not exposed to browser code. `NEXT_PUBLIC_API_URL` remains an optional
development override and is empty by default. Django still owns the opaque
HttpOnly session cookie and CSRF protection. Every request includes
credentials, and unsafe methods copy the readable CSRF cookie into
`X-CSRFToken` centrally.

The root layout stays a Server Component. A narrow client-side provider runs
the idempotent session bootstrap once and exposes `bootstrapping`, `ready`, or
`error` state to interactive descendants. Concurrent bootstrap calls share one
promise, and expected API errors retain their HTTP status, stable code, detail,
and field errors.

The customer interface is organized as a feature module under
`src/features/returns`. Its contract types, request functions, presentation,
and tests remain together. The first connected screen lists the visitor's
paginated returns and exercises real retrieve and catalog-backed create
operations; all requests still pass through the shared cookie and CSRF-aware
client. Eligible demo orders are persisted per visitor. The frontend submits
only catalog UUIDs, quantities, reasons, and details, while Django copies and
locks customer, product, SKU, and price fields transactionally.

Mutable requests open a dedicated three-step client workflow: items, curated
evidence, and review. Each nested mutation is followed by a fresh aggregate
read so server-computed counts and monetary totals remain authoritative. The
final action uses the explicit submission command rather than accepting a
client-selected status; `NEEDS_INFORMATION` resubmissions additionally require
the operations response note defined by the domain contract.

The operations role is implemented as a second client-side view in the same
feature module. It consumes the dedicated non-draft operations selectors,
supports search, status filters, ordering and pagination, and lazily fetches
aggregate detail when a row is expanded. Desktop renders the hierarchy inside
the table; mobile replaces rows with expandable request cards. Dataset reset
continues through the shared CSRF-aware client and remains scoped to the
current visitor.

The frontend interface is implemented with Tailwind CSS 4. Semantic theme
tokens and a minimal base layer live in `globals.css`; reusable controls,
surfaces, and contextual patterns remain in three statically discoverable
TypeScript catalogs. The complete conventions, accessibility contract, and
visual verification workflow are defined in the
[frontend interface system](frontend-interface-system.md).

Next.js Route Handlers are not used as a general proxy for the returns API.
The existing platform-health handler remains server-side because it checks
container connectivity and does not participate in visitor ownership.

## Health and startup

PostgreSQL must pass `pg_isready` before Django starts. Django applies
migrations through its container entrypoint and exposes `/api/health/`. That
endpoint performs a real database query. Next.js waits for the API health check
before its container is considered healthy.

## Security baseline

- Database and application ports bind to the local loopback interface.
- Django allowed hosts, CORS, CSRF origins, and secret key are environment
  controlled.
- `DEBUG` defaults to true only for local development.
- The production container runs Django through Gunicorn.
- Visitor isolation and secure session-cookie behavior are enforced by the
  current domain and API implementation.

## First vertical slice

```text
Visitor session
  -> customer creates a draft return
  -> customer adds fictional items and evidence
  -> customer submits the return
  -> operations sees it in the expandable queue [implemented]
  -> operations changes its state [implemented]
  -> customer sees the updated state and timeline
```

This slice establishes the real data model and API contract before the
remaining screens are implemented.

The normative behavior and security boundary for this slice are defined in
[ReturnOps v1: domain and visitor-isolation contract](returns-domain-contract.md).
