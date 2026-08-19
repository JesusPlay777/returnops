# Xmart fictional demo scenario

## Purpose

The Xmart live demo will recreate one focused clean-room workflow inside
ReturnOps: provisioning a fictional customer operator and assigning a
synthetic device before reviewing the resulting security audit trail. It does
not copy or connect to either original Xmart application.

Every organization, person, identifier, network address, capacity, and event
in this scenario is fictional and exists only for portfolio demonstration.

## Canonical identities

| Concept | Fictional value |
| --- | --- |
| Customer | `Atlas Field Services` |
| Project | `Atlas Network Rollout` |
| Acting administrator | `portfolio.admin@example.test` |
| Target operator | `field.operator@example.test` |
| Audit IP | `192.0.2.44` |
| Device model | `Orion X5 Demo` |
| Synthetic identifier | `DEMO-IMEI-0001` |

The `.example.test` addresses cannot represent deliverable mailboxes. The IP
belongs to `192.0.2.0/24`, reserved for documentation. The device identifier
is deliberately non-numeric and prefixed with `DEMO-IMEI-` so it cannot be
mistaken for a real device IMEI.

## Contracted modules

- Field Testing
- Device Management
- Log Center
- Security Audit

## Capacity timeline

| Stage | Users | Storage | IMEIs | Visible change |
| --- | ---: | ---: | ---: | --- |
| Customer workspace | `4 / 10` | `6.4 / 20 GB` | `8 / 15` | Initial limits are reviewed. |
| User access | `5 / 10` | `6.4 / 20 GB` | `8 / 15` | Activating the operator consumes one seat. |
| Device assignment | `5 / 10` | `6.4 / 20 GB` | `9 / 15` | Assigning the synthetic device consumes one IMEI slot. |
| Security audit | `5 / 10` | `6.4 / 20 GB` | `9 / 15` | Operations are recorded without changing capacity. |
| Workflow complete | `5 / 10` | `6.4 / 20 GB` | `9 / 15` | The final state summarizes the completed provisioning. |

Storage deliberately remains unchanged because neither activating a user nor
assigning an existing synthetic device represents a file-storage operation.

## State machine

```text
CUSTOMER_WORKSPACE
  -> USER_ACCESS
  -> DEVICE_ASSIGNMENT
  -> SECURITY_AUDIT
  -> WORKFLOW_COMPLETE
```

Each call to the transition service advances exactly one stage:

1. User access activates `field.operator@example.test`, consumes one seat,
   and records both the activation and an in-app verification preview. It
   never sends external email.
2. Device assignment links `DEMO-IMEI-0001` to
   `Atlas Network Rollout`, changes it from `AVAILABLE` to `ASSIGNED`,
   and consumes one IMEI slot.
3. Security audit reviews the accumulated fictional operations without
   changing capacity.
4. Workflow complete records the final provisioning result.

At the terminal state, further transition calls return the same aggregate
without updating timestamps or creating duplicate events.

## Persistence boundary

The scenario is stored as one `XmartDemoWorkspace` for each
`VisitorSession`. Its contracted modules, target user, synthetic device, and
ordered audit events are child records owned exclusively by that workspace.
Creating the scenario is idempotent for one visitor, while resetting or
deleting it cannot modify another visitor's aggregate.

Deleting an expired `VisitorSession` cascades through every Xmart record. The
existing cleanup command therefore needs no Xmart-specific query or scheduled
process.

The visitor and workspace rows are locked before each transition. Child
updates, capacity changes, the new phase, and audit events commit in one
database transaction. Reset deletes and recreates only the requesting
visitor's aggregate.

## HTTP surface

The versioned API exposes three routes:

| Method and path | Purpose |
| --- | --- |
| `GET /api/v1/xmart/demo/` | Seed once or retrieve the current state. |
| `POST /api/v1/xmart/demo/advance/` | Commit exactly one synchronous transition. |
| `POST /api/v1/xmart/demo/reset/` | Recreate only the requesting visitor's scenario. |

Ownership is resolved exclusively from the opaque Django session cookie. The
API accepts no visitor or workspace identifier in a path, query, header, or
request body. Both write operations require the session's CSRF token, and
reset uses the same per-visitor throttle as the other portfolio demos.

The bilingual `/xmart` interface retrieves this aggregate through the shared
session-aware browser client. It presents customer capacity, contracted
modules, user access, synthetic device assignment, the five-stage workflow,
and the ordered audit trail at desktop and mobile widths. Its controls call
only the explicit advance and reset commands.

This workflow adds no dependency, environment variable, port, worker, broker,
or service to the current 256 MB runtime.
