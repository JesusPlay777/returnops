# ReturnOps

ReturnOps is a clean-room, bilingual returns-operations demo. It recreates a
realistic customer-to-operations workflow using fictional data, without
copying proprietary code, visual assets, or private information.

This repository is a monorepo containing:

- `frontend/`: Next.js, React, and TypeScript.
- `backend/`: Django REST Framework and PostgreSQL.
- `docs/`: architecture and decision records.
- `compose.yaml`: the complete local development environment.

## Current scope

The initial release intentionally uses a synchronous architecture:

- Next.js frontend
- Django REST Framework API
- PostgreSQL persistence
- Docker Compose for local development

Celery and Redis are not part of the initial scope. They will only be
introduced if a measured asynchronous workload justifies them.

## Production

The public deployment is available at:

- Portfolio: <https://jesus-rojas-portfolio.vercel.app>
- ReturnOps live demo: <https://returnops-six.vercel.app>
- API health: <https://returnops-api.onrender.com/api/health/>
- API documentation: <https://returnops-api.onrender.com/api/v1/docs/>

The portfolio links to an independent ReturnOps frontend on Vercel. Relative
API requests are rewritten to the Django service on Render, and Django is the
only application layer connected to the managed Neon PostgreSQL database. See
the [production architecture](docs/production-architecture.md) for the full
topology, request path, provider responsibilities, and deployment flow.

## Prerequisites

- Docker Desktop with WSL 2 integration
- Docker Compose

Node.js and Python are optional when using Docker. For host-based checks, use
Node.js 22+ and Python 3.11+.

## Start the platform

The committed defaults are safe for local development, so the platform can be
started immediately:

```bash
docker compose up --build
```

Optional: copy the environment template before customizing values.

```bash
cp .env.example .env
docker compose up --build
```

Open:

- Customer returns demo: http://localhost:3000
- API health: http://localhost:8000/api/health/
- API documentation: http://localhost:8000/api/v1/docs/
- OpenAPI schema: http://localhost:8000/api/v1/schema/
- Django admin: http://localhost:8000/admin/

The backend container applies Django migrations before starting.

The customer screen uses the real visitor-isolated API. Drafts begin from a
small catalog of eligible fictional orders rather than free-form customer or
product input. Django owns customer identity, SKU, purchased quantity, and
price; the browser selects items, return quantities, reasons, and optional
details. The responsive workflow then manages curated evidence, review, and
submission or resubmission in English and Spanish.

The same screen can switch to the operations role. Its responsive queue uses
the real operations API to search, filter, order, and paginate non-draft
requests. Each row expands into the request -> items -> evidence hierarchy,
and the demo dataset can be reset without affecting any other visitor. The
full decision view lets operations request information, approve, or reject a
return. A customer can answer a request for information and resubmit it through
the same isolated workflow.

## Common commands

```bash
# Run backend checks and tests
docker compose exec backend python manage.py check
docker compose exec backend python manage.py test

# Run frontend quality checks
docker compose exec frontend npm run lint
docker compose exec frontend npm run typecheck
docker compose exec frontend npm test

# Create a Django administrator
docker compose exec backend python manage.py createsuperuser

# Stop the platform without deleting data
docker compose down
```

## Browser end-to-end validation

With the Docker services healthy, run Playwright from WSL:

```bash
cd frontend
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium  # first run only
npm run test:e2e
```

The browser suite validates the complete customer -> operations -> customer
lifecycle and compares approved responsive screenshots. See
[the testing guide](docs/testing.md) for focused commands, headed diagnosis,
and the snapshot review policy.

To reset only the local PostgreSQL data, explicitly remove the Compose volume:

```bash
docker compose down --volumes
```

## Host-based checks

The backend can use SQLite only for isolated checks when PostgreSQL is not
available:

```bash
cd backend
DB_ENGINE=sqlite python manage.py check
DB_ENGINE=sqlite python manage.py test
```

The application itself uses PostgreSQL in Docker and in deployed environments.

## Documentation

- [Architecture](docs/architecture.md)
- [Production architecture and public URLs](docs/production-architecture.md)
- [Deployment configuration without secrets](docs/deployment-configuration.md)
- [API v1 and browser security](docs/api.md)
- [OpenAPI schema snapshot](docs/openapi.yaml)
- [Returns domain and visitor-isolation contract](docs/returns-domain-contract.md)
- [ADR 0001: synchronous core](docs/decisions/0001-synchronous-core.md)
- [Automated testing](docs/testing.md)
- [Frontend interface system](docs/frontend-interface-system.md)
