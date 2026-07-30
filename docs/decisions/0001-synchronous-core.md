# ADR 0001: Keep the initial core synchronous

- Status: accepted
- Date: 2026-07-30

## Context

ReturnOps is a public portfolio demonstration with a modest fictional workload.
The essential experience is creating, reviewing, and updating return requests.
None of those operations requires a continuously running background worker.

Celery is open-source software, but operating it requires a worker and normally
a message broker such as Redis. Those services add deployment cost, operational
surface area, and failure modes without improving the initial demonstration.

## Decision

The first release will use only Next.js, Django REST Framework, and PostgreSQL.
State transitions, timeline entries, demo reset, and visitor-session creation
will be handled synchronously and transactionally by Django.

Fictional evidence will be preloaded or stored through the web service.
Session expiry will use an `expires_at` field and request-time filtering.
Notifications will appear in the in-app timeline rather than being delivered
by email.

## Consequences

- The complete approved workflow remains demonstrable.
- Local and public deployment require fewer services.
- State changes and their timeline events can share one database transaction.
- Long-running or retryable tasks are deferred.

If a future requirement introduces expensive file processing, real email,
scheduled batch work, webhooks with retry guarantees, or measured request
latency that cannot remain synchronous, a new ADR will evaluate a queue and
worker. Celery and Redis will not be added preemptively.
