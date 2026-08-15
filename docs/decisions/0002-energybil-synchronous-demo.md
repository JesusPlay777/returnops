# ADR 0002: Reduce Energybil to one synchronous portfolio demo

- Status: accepted
- Date: 2026-08-14

## Context

The original Energybil repository demonstrates a broad enterprise energy
domain, including device ingestion, consumption, billing, reports, email,
Celery, and Redis. Running that complete topology beside ReturnOps would add a
worker, broker, duplicated framework process, and a second deployment surface
to a 256 MB portfolio environment.

The portfolio needs a short, credible operational story rather than every
historical subsystem. The strongest author-owned sequence is meter reading to
invoice and notification.

## Decision

Implement a clean-room Energybil feature inside the ReturnOps monorepo and its
existing Django/Next.js deployments. Preserve real relational state,
calculations, transaction boundaries, visitor isolation, and audit events.

Execute the five stages synchronously:

1. receive the fictional gateway reading;
2. validate timestamp, duplicate, and monotonic rules;
3. calculate consumption and charges;
4. issue the invoice preview;
5. record a simulated in-app notification.

Do not copy source code or runtime configuration from the original repository.
Do not add Redis, Celery, email delivery, reports, file exports, or another
service. The original repository remains a read-only domain reference.

## Consequences

- ReturnOps remains one web backend, one frontend, and one PostgreSQL database.
- The portfolio shows authentic domain reasoning without operating a queue.
- The simulated boundary is visible to users instead of pretending an email
  was delivered.
- Existing session expiry removes both ReturnOps and Energybil data by cascade.
- A real external delivery requirement would require a new ADR and measured
  resource budget.
