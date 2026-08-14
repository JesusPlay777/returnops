# Energybil synchronous demo contract

## Purpose

Energybil is a focused, clean-room portfolio workflow inside ReturnOps. It
demonstrates the author-owned domain story `gateway reading -> validation ->
consumption -> invoice -> notification` without copying the original Energybil
application or operating its Celery and Redis topology.

All customer, property, account, meter, reading, invoice, and notification data
is fictional.

## Ownership and isolation

Each `EnergyDemoAccount` has exactly one `VisitorSession`. The API never accepts
a visitor UUID in a path, query, header, or body. It resolves ownership only
from the opaque Django session created by `GET /api/v1/session/`.

The site owns one meter, one current invoice, and an ordered set of workflow
events. Deleting an expired visitor cascades through the complete Energybil
aggregate. A visitor can never read, advance, or reset another visitor's rows.

## State machine

```text
READING_RECEIVED
  -> READING_VALIDATED
  -> CONSUMPTION_CALCULATED
  -> INVOICE_ISSUED
  -> NOTIFICATION_SIMULATED
```

`POST /api/v1/energybil/demo/advance/` applies at most one transition. At the
terminal state it is idempotent: the response remains successful,
`did_advance=false`, and no duplicate event is created.

Every transition locks the visitor row and commits the aggregate update and
its workflow event in one PostgreSQL transaction.

## Billing rules

The canonical fictional scenario uses:

- previous reading: `17800.500 kWh`;
- current reading: `18142.800 kWh`;
- consumption: `342.300 kWh`;
- energy rate: `USD 0.1675/kWh`;
- fixed service charge: `USD 9.50`;
- tax rate: `7%`.

Money is rounded half-up to two decimal places. The resulting invoice is:

```text
energy charge  57.34
fixed charge    9.50
subtotal       66.84
tax             4.68
total          71.52 USD
```

## Simulation boundary

The final transition writes a notification preview and timestamp to the
invoice aggregate. It does not send email, publish a task, enqueue a message,
or claim external delivery. The frontend labels this boundary explicitly.

## HTTP surface

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/api/v1/energybil/demo/` | Seed once or retrieve the visitor scenario |
| `POST` | `/api/v1/energybil/demo/advance/` | Commit one state transition |
| `POST` | `/api/v1/energybil/demo/reset/` | Replace only the active visitor scenario |

Unsafe requests require the shared CSRF cookie/header contract. Reset uses the
same per-visitor throttle as the ReturnOps demo reset.

## Deployment boundary

Energybil adds Django tables, API routes, and one statically generated Next.js
route. It adds no package, environment variable, port, process, service,
volume, broker, or worker. Northflank applies the committed migration through
the existing entrypoint before starting the existing Gunicorn process.
