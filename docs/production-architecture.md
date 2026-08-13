# Production architecture

## Status

ReturnOps is deployed as a public clean-room portfolio demonstration. The
production topology described here reflects the deployment validated on
2026-08-13.

## Public entry points

| Surface | Production URL | Purpose |
| --- | --- | --- |
| Portfolio | <https://jesus-rojas-portfolio.vercel.app> | Public portfolio and entry point to the live demo. |
| ReturnOps web application | <https://returnops-six.vercel.app> | Bilingual customer and operations demo. |
| API health | <https://returnops-api.onrender.com/api/health/> | Backend and database readiness check. |
| API documentation | <https://returnops-api.onrender.com/api/v1/docs/> | Interactive OpenAPI documentation. |
| OpenAPI schema | <https://returnops-api.onrender.com/api/v1/schema/> | Machine-readable API contract. |

The Django administration route is intentionally disabled in production and
returns `404 Not Found`. It is not part of the public demo surface.

## Provider topology

```text
Visitor
  |
  v
Portfolio — Vercel
jesus-rojas-portfolio.vercel.app
  |
  | Live demo link (external navigation)
  v
ReturnOps frontend — Vercel
returnops-six.vercel.app
  |
  | same-origin /api/* requests
  | Next.js rewrite
  v
ReturnOps API — Render
returnops-api.onrender.com
  |
  | encrypted PostgreSQL connection
  v
ReturnOps database — Neon
managed PostgreSQL
```

The portfolio and ReturnOps are deliberately separate applications and
repositories. The portfolio only links to the demo; it does not bundle,
replicate, or serve the ReturnOps frontend.

## Browser request path

1. A visitor opens the ReturnOps application on its Vercel domain.
2. The frontend calls relative paths such as `/api/v1/session/`.
3. Vercel applies the Next.js rewrite and forwards the request to the Render
   API origin.
4. Django validates the visitor session, applies the domain rules, and reads
   or writes fictional data in Neon PostgreSQL.
5. The response returns through the same Vercel origin. The browser never
   receives database credentials or selects a visitor UUID.

This same-origin boundary lets Django keep ownership of the opaque session
cookie and CSRF protection while avoiding direct cross-origin API calls from
browser code.

## Service responsibilities

### Portfolio on Vercel

- Presents the public case study.
- Exposes the `Live demo` link to the stable ReturnOps web URL.
- Deploys independently from the `jesus-rojas-portfolio` repository.

### ReturnOps frontend on Vercel

- Builds the `frontend/` Next.js application.
- Serves the bilingual customer and operations interface.
- Proxies relative API requests to the configured backend origin.
- Displays a bounded cold-start state while the free backend wakes up.

### ReturnOps API on Render

- Builds the `backend/` Django container.
- Applies migrations, removes expired demo data, and collects static assets
  before Gunicorn starts.
- Enforces visitor isolation, CSRF, transition rules, throttling, and the API
  contract.
- Serves health, schema, and API-documentation endpoints.

### PostgreSQL on Neon

- Persists Django sessions and the isolated fictional datasets.
- Is reachable by the backend only through the production database secret.
- Can scale to zero while inactive, independently of the Render service.

## Deployment flow

```text
JesusPlay777/jesus-rojas-portfolio main
  -> Vercel portfolio production deployment

JesusPlay777/returnops main
  -> Vercel ReturnOps frontend production deployment
  -> Render ReturnOps API production deployment
  -> Django migrations against Neon during backend startup
```

Work is prepared and verified on the `test` branches. Production changes only
begin after approved work is merged and pushed to `main`. Vercel and Render
replace their active production release only after their respective build and
startup checks succeed.

Neon is a managed dependency rather than a deployable artifact from this
repository. Schema changes reach it through committed Django migrations.

## Free-tier behavior

The Render API and Neon compute can become idle. The first request after an
idle period may therefore take substantially longer than a warm request. The
frontend health bootstrap communicates this state and retries automatically;
visitors do not need to open or manually stimulate the API health URL.

## Security boundary

- Production secrets are stored only in provider environment settings.
- Database credentials and Django's secret key are never exposed to Vercel
  browser code or committed to Git.
- The frontend uses a server-side backend-origin setting for its rewrite.
- Django explicitly restricts allowed hosts and trusted frontend origins.
- Secure session and CSRF cookies are enabled when debug mode is disabled.
- Public uploads and proprietary data are outside the demo scope.

The names of required settings are documented separately from their secret
production values. No credential, token, database hostname, or generated key
belongs in this document.
