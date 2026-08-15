# Deployment configuration

## Purpose and secret policy

This document records the production deployment settings required to
reproduce the current ReturnOps topology without storing credentials. It is a
configuration inventory, not an environment file.

Use the following notation:

- `<generated secret>` means the value must be created and stored in the named
  provider.
- `<provider connection string>` means the value must be copied directly
  between provider secret stores, never through Git.
- Public HTTPS origins and host names are safe to document.

Never commit a real `DATABASE_URL`, `DJANGO_SECRET_KEY`, provider token, or
recovery code. Do not paste secrets into pull requests, screenshots, build
arguments, `NEXT_PUBLIC_*` variables, or browser code.

## Portfolio project on Vercel

| Setting | Value |
| --- | --- |
| Vercel project | `jesus-rojas-portfolio` |
| Git repository | `JesusPlay777/jesus-rojas-portfolio` |
| Production branch | `main` |
| Framework preset | Next.js |
| Root directory | Repository root (`./`) |
| Build command | Next.js default |
| Output directory | Next.js default |
| Install command | Package-manager default |
| Production URL | `https://jesus-rojas-portfolio.vercel.app` |

### Portfolio environment variables

| Variable | Production value | Visibility | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://jesus-rojas-portfolio.vercel.app` | Public | Canonical origin used by metadata, sitemap, and robots output. |
| `NEXT_PUBLIC_RETURNOPS_DEMO_URL` | `https://returnops-six.vercel.app` | Public | Stable destination of the ReturnOps `Live demo` link. |

Both variables are intentionally public because Next.js includes
`NEXT_PUBLIC_*` values in browser-visible build output. They must never contain
credentials.

## ReturnOps frontend on Vercel

| Setting | Value |
| --- | --- |
| Vercel project | `returnops` |
| Git repository | `JesusPlay777/returnops` |
| Production branch | `main` |
| Framework preset | Next.js |
| Root directory | `frontend` |
| Build command | Next.js default |
| Output directory | Next.js default |
| Install command | Package-manager default |
| Production URL | `https://returnops-six.vercel.app` |

Do not override the output directory with `public`, `.next`, `Default`, or any
other literal value. Vercel's Next.js preset owns the build output.

### ReturnOps frontend environment variables

| Variable | Production value | Visibility | Purpose |
| --- | --- | --- | --- |
| `BACKEND_INTERNAL_URL` | `https://http--returnops-api--hk88tqk8y2dz.code.run` | Server-only, non-secret | Origin used by the Next.js rewrite and platform-health handler. It must have no trailing slash, path, query, fragment, or credentials. |
| `NEXT_PUBLIC_API_URL` | Unset | Public when present | Optional local-development override. Keeping it unset in production preserves the same-origin proxy boundary. |

`BACKEND_INTERNAL_URL` may be configured for Production and Preview when both
environments intentionally use the public demo API. It is not a credential,
but it must not use the `NEXT_PUBLIC_` prefix because browser code does not
need the backend origin.

Do not add Django or PostgreSQL variables to the Vercel frontend project.

## ReturnOps API on Northflank

| Setting | Value |
| --- | --- |
| Service type | Combined service |
| Service name | `returnops-api` |
| Runtime | Docker |
| Git repository | `JesusPlay777/returnops` |
| Production branch | `main` |
| Region | US - Central (Council Bluffs) |
| Docker build context | `/backend` |
| Dockerfile path | `/backend/Dockerfile` |
| Compute plan | `nf-compute-10` (`0.1` shared vCPU, `256 MB`) |
| Instances | `1` |
| Continuous deployment | Enabled for `main` |
| Public port | `http`, port `8000`, protocol `HTTP` |
| Health check path | `/api/health/` |
| Public origin | `https://http--returnops-api--hk88tqk8y2dz.code.run` |
| Docker runtime mode | Default configuration |

The Docker `production` target supplies Gunicorn as the runtime command.
Northflank exposes the single configured HTTP port; no second service or port
is required for Energybil.

### Required Northflank runtime variables

| Variable | Safe representation | Secret | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | `<Neon direct connection string>` | Yes | Complete PostgreSQL URL copied from Neon. Required when debug mode is disabled. |
| `DJANGO_SECRET_KEY` | `<generated secret>` | Yes | High-entropy Django signing key stored in Northflank. |
| `DJANGO_DEBUG` | `false` | No | Enables the production security and renderer configuration. |
| `DJANGO_ALLOWED_HOSTS` | `http--returnops-api--hk88tqk8y2dz.code.run` | No | Accepted API host name without scheme or path. |
| `DJANGO_CORS_ALLOWED_ORIGINS` | `https://returnops-six.vercel.app` | No | Comma-separated browser origins, including scheme and without trailing slash. |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://returnops-six.vercel.app` | No | Trusted HTTPS origin required for unsafe requests forwarded by the frontend proxy. |
| `DJANGO_ENABLE_ADMIN` | `false` | No | Keeps Django admin outside the public demo surface. |
| `RETURNOPS_VISITOR_SESSION_TTL_HOURS` | `24` | No | Expires each isolated visitor sandbox after 24 hours. |
| `RETURNOPS_BOOTSTRAP_THROTTLE_RATE` | `30/hour` | No | Limits new sandbox creation per client. |
| `RETURNOPS_RESET_THROTTLE_RATE` | `10/hour` | No | Limits dataset resets per visitor. |
| `PORT` | `8000` | No | Must match the public Northflank HTTP port. |
| `WEB_CONCURRENCY` | `1` | No | Keeps Gunicorn within the 256 MB runtime limit. |
| `GUNICORN_THREADS` | `2` | No | Provides bounded request concurrency inside the single worker. |
| `GUNICORN_TIMEOUT` | `60` | No | Bounds individual request execution. |

The CORS and CSRF lists contain the ReturnOps frontend, not the portfolio. The
portfolio performs normal external navigation to the demo and never calls the
ReturnOps API.

### Defaults owned by code or provider

These settings normally require no dashboard override:

- `DJANGO_SECURE_SSL_REDIRECT` defaults to enabled in production.
- `DJANGO_SECURE_HSTS_SECONDS` defaults to `3600` in production.
- HSTS subdomain coverage and preload remain disabled until a controlled
  custom domain is introduced.
- Local `POSTGRES_*` variables belong to Docker Compose and are not required
  when `DATABASE_URL` is present.

### Backend build, startup, and readiness

The production image collects static assets during its build:

```text
python manage.py collectstatic --noinput
```

The committed container entrypoint then performs only the runtime-dependent
steps on every Northflank start:

```text
python manage.py migrate --noinput
  -> python manage.py cleanup_expired_demo_data --no-color
  -> Gunicorn on 0.0.0.0:$PORT
```

The static build uses an isolated SQLite configuration and does not require
production credentials or a connection to Neon. Keeping `collectstatic` out
of the runtime entrypoint reduces startup memory and allows small deployment
instances to reach their readiness probe reliably. Northflank's readiness
probe targets port `8000`, path `/api/health/`, with a `90` second initial
delay, `30` second interval, `10` second timeout, and failure threshold `5`.
Energybil adds one migration to this existing sequence and no new startup step.

## PostgreSQL on Neon

| Setting | Value |
| --- | --- |
| Neon project | `returnops` |
| Branch | `production` (default) |
| Database | `neondb` |
| Application role | `neondb_owner` |
| Region | AWS US East 1 (N. Virginia) |
| Connection mode | Direct connection; pooling disabled for the initial single backend instance |
| TLS | Required by the provider connection string |

The Neon connection string is stored only as Northflank's secret `DATABASE_URL`.
It must not be added to Vercel, `.env.example`, GitHub, documentation, or
frontend code. Django migrations are the sole source of production schema
changes.

## Branch and deployment policy

| Branch | Purpose | Production effect |
| --- | --- | --- |
| `test` | Development, automated checks, visual review, and approval | None until merged. A Vercel preview can be created if the branch is pushed. |
| `main` | Approved production source | A push triggers the connected Vercel and Northflank production deployments. |

A local merge does not deploy anything. Production changes only after the
updated `main` branch reaches GitHub. Failed builds do not replace the last
successful Vercel or Northflank release.

## Verification after a production deployment

1. Confirm the Northflank service reports `Running` with `1/1 passing`.
2. Open `https://http--returnops-api--hk88tqk8y2dz.code.run/api/health/` and verify that the
   service and database report `ok`.
3. Confirm the API documentation loads and `/admin/` returns `404`.
4. Open `https://returnops-six.vercel.app` in a private browser session.
5. Complete the customer -> operations -> customer workflow.
6. Open `https://returnops-six.vercel.app/energybil`, advance all five stages,
   and confirm the final amount is `USD 71.52`.
7. Open the portfolio and confirm that `Live demo` navigates to the stable
   ReturnOps production URL.

The health URL is a diagnostic endpoint, not a keep-alive requirement. The
frontend handles expected free-tier cold starts automatically.
