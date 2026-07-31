# ReturnOps v1: domain and visitor-isolation contract

- Status: accepted
- Date: 2026-07-30
- Scope: first functional vertical slice

## 1. Purpose

This document is the source of truth for the first ReturnOps domain slice. It
defines the behavior that the Django models, services, selectors, serializers,
endpoints, and PostgreSQL tests must preserve.

ReturnOps is a clean-room portfolio demonstration. It models a realistic
returns workflow with fictional people, products, evidence, identifiers, and
events. It must not contain or request information from the original workplace
system.

This contract intentionally precedes implementation. A model or endpoint is not
complete merely because it works in the happy path; it must also satisfy the
isolation and state invariants below.

## 2. Product boundary

The first vertical slice supports two perspectives:

- **Customer** creates and follows a return request.
- **Operations** reviews submitted requests and makes a decision.

There is no registration or real user account in v1. A visitor can switch
between both perspectives to demonstrate the complete workflow.

The role selector is a demo navigation mechanism, not an authorization
boundary. Authorization is based on the server-resolved visitor sandbox.
Customer and operations actions use separate endpoints so the server can
attribute each event without trusting a role supplied in a request body.

All interface text is bilingual. API field names, state values, reason codes,
and error codes remain stable and language-neutral; Next.js translates their
presentation into English or Spanish.

## 3. Domain vocabulary

### VisitorSession

The server-side sandbox that owns every return and child record created or
seeded for one browser visitor. It has an expiration time and is resolved from
the Django session, never from a visitor identifier supplied by the browser.

### ReturnRequest

The aggregate root. It contains customer-facing fictional details, a display
reference, the current state, monetary summary, and timestamps.

### DemoOrder and DemoOrderItem

The small server-owned catalog of fictional purchases eligible for the demo.
Each order is isolated by `VisitorSession`. Customer identity, SKU, product
name, purchased quantity, and price originate here and are never accepted as
authoritative browser input.

### ReturnItem

A fictional product and quantity included in a return. An item belongs to
exactly one return request.

### Evidence

A fictional attachment associated with exactly one return item. The first
release uses curated demo assets; it does not accept arbitrary personal files
from public visitors.

### StatusEvent

An immutable timeline entry recording creation or a state transition, its
actor, time, and optional explanatory note.

## 4. Ownership and aggregate invariants

```text
VisitorSession
├── DemoOrder
│   └── DemoOrderItem
└── ReturnRequest
    ├── ReturnItem -> DemoOrderItem
    │   └── Evidence
    └── StatusEvent
```

The following invariants are mandatory:

1. Every `ReturnRequest` belongs to exactly one `VisitorSession`.
2. Every item belongs to exactly one return, and every evidence record belongs
   to exactly one item.
3. A child resource inherits ownership through its parent. It cannot be moved
   to another return or visitor.
4. `ReturnRequest.status` can change only through the domain transition
   service. Generic create or update endpoints cannot set it arbitrarily.
5. Each successful status change creates one `StatusEvent` in the same database
   transaction.
6. Status events are append-only through the public API.
7. Monetary totals and item counts are computed by the server. Client totals
   are never authoritative.
8. Currency is `USD` in v1. Decimal amounts are serialized as strings with two
   decimal places.
9. Resource identifiers are opaque UUIDs. Human references such as `RTN-204`
   are display values and are not authorization credentials.
10. Timestamps are timezone-aware and serialized in ISO 8601 UTC.
11. A demo order can create at most one active return request.
12. Customer, product, SKU, unit price, and maximum quantity are copied from
    the server-owned catalog in the same transaction that creates the draft.

## 5. Lifecycle

The only allowed states are:

- `DRAFT`
- `SUBMITTED`
- `NEEDS_INFORMATION`
- `APPROVED`
- `REJECTED`

The only allowed transitions are:

```text
DRAFT ──customer submit──> SUBMITTED
                               ├──operations──> NEEDS_INFORMATION
                               ├──operations──> APPROVED
                               └──operations──> REJECTED

NEEDS_INFORMATION ──customer resubmit──> SUBMITTED
```

`APPROVED` and `REJECTED` are terminal in v1.

### Transition rules

| Current state | Actor | Action | Target | Requirements |
| --- | --- | --- | --- | --- |
| `DRAFT` | Customer | Submit | `SUBMITTED` | At least one valid item |
| `SUBMITTED` | Operations | Request information | `NEEDS_INFORMATION` | Non-empty explanatory note |
| `SUBMITTED` | Operations | Approve | `APPROVED` | Optional note |
| `SUBMITTED` | Operations | Reject | `REJECTED` | Non-empty explanatory note |
| `NEEDS_INFORMATION` | Customer | Resubmit | `SUBMITTED` | Non-empty response note |

Invalid or stale transitions return `409 Conflict`; they never silently
succeed. Transition services lock the return row and re-check the current state
inside `transaction.atomic()`.

### Mutability

- In `DRAFT`, catalog identity and price fields are immutable. The customer can
  adjust selected quantities up to the purchased amount, reasons, details, and
  curated evidence.
- In `SUBMITTED`, the customer view is read-only. Operations can only perform
  one of the documented state transitions; it cannot rewrite customer data.
- In `NEEDS_INFORMATION`, the customer can update mutable item fields and
  evidence and then resubmit with a response note.
- In `APPROVED` and `REJECTED`, the aggregate is read-only through the public
  API.
- A draft may be deleted. A submitted or terminal return may not be deleted
  through the public API.

## 6. Visitor bootstrap and cookie contract

`GET /api/v1/session/` bootstraps or returns the current demo session:

1. Django resolves its opaque, `HttpOnly` session cookie.
2. The session stores the internal `VisitorSession` UUID.
3. If no active visitor exists, Django creates one and seeds its fictional
   dataset atomically.
4. The internal visitor UUID is not required in subsequent API URLs, query
   parameters, headers, or bodies.
5. An expired visitor is never reused. The session endpoint creates a new
   sandbox; other domain endpoints return `401 visitor_session_required` until
   bootstrap completes.

The default visitor lifetime is configurable, with 24 hours as the initial
development value. Expiration is enforced synchronously on every request. No
Celery worker or scheduled cleanup is required for correctness; expired data is
unreachable and may later be purged by a management command.

Unsafe requests use Django's CSRF protection. The frontend sends cookies with
`credentials: "include"` and supplies the CSRF token using the standard
`X-CSRFToken` header. Production should expose the browser and API through the
same site where practical.

The session response exposes behavior, not an ownership key:

```json
{
  "expires_at": "2026-07-31T16:00:00Z",
  "available_roles": ["CUSTOMER", "OPERATIONS"],
  "supported_locales": ["en", "es"],
  "dataset_ready": true
}
```

## 7. Isolation rules

Visitor isolation is a server-side invariant, not merely a view filter.

### Query rules

- Every return queryset starts from the current active `VisitorSession`.
- Every demo-order queryset starts from the current active `VisitorSession`
  and excludes orders already connected to a return.
- Detail lookups combine the resource UUID with the current visitor scope.
- Item, evidence, and event lookups traverse their parent and enforce the same
  visitor scope.
- The operations queue contains non-draft returns from the current visitor
  only.
- Customer views contain returns from the current visitor only.
- IDs, references, search terms, filters, ordering, and request payloads can
  narrow the current scope but can never replace it.

The implementation must follow this shape:

```python
ReturnRequest.objects.filter(
    visitor_session=current_visitor,
)
```

It must never follow this shape:

```python
ReturnRequest.objects.all()
```

for a public list or detail operation.

### Non-disclosure behavior

If visitor A requests a valid UUID owned by visitor B, the API responds with
`404 Not Found`, exactly as it would for a nonexistent UUID. It must not reveal
that another visitor's resource exists.

The same rule applies to nested resources. Supplying an item UUID from another
return or visitor cannot read, modify, attach evidence to, or delete it.

### Operations perspective

Operations is not a global administrator. Switching to Operations shows the
backoffice experience for the current visitor's fictional dataset only. This
keeps the full demo usable without exposing data created by other public
visitors.

Django admin is outside the public demo contract. If enabled in a deployed
environment, it requires real staff authentication and must not be linked from
the public interface.

## 8. Demo data and reset

The initial dataset is created from version-controlled fictional fixtures. It
must contain no copied names, emails, product data, files, or identifiers from
the original application.

`POST /api/v1/demo/reset/` performs one atomic operation:

1. Lock the current `VisitorSession`.
2. Delete only aggregates owned by that visitor.
3. Recreate the canonical fictional dataset.
4. Preserve the browser's visitor session and refresh its expiration.
5. Return the new dataset summary.

The endpoint is idempotent from the user's perspective: repeated resets produce
the same scenario and display references, although opaque UUIDs may change.
A reset by visitor A cannot modify visitor B's rows.

Example response:

```json
{
  "reset_at": "2026-07-30T16:00:00Z",
  "return_count": 14,
  "message_code": "demo_reset_complete"
}
```

## 9. Planned HTTP contract

All endpoints use the `/api/v1/` prefix.

### Session and reset

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/session/` | Bootstrap or inspect the active visitor sandbox |
| `GET` | `/demo/orders/` | List unused eligible fictional orders and items |
| `POST` | `/demo/reset/` | Reset only the active visitor dataset |

### Customer perspective

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/returns/` | List the current visitor's returns |
| `POST` | `/returns/` | Create a `DRAFT` from catalog IDs and selections |
| `GET` | `/returns/{return_id}/` | Get the aggregate and timeline |
| `DELETE` | `/returns/{return_id}/` | Delete a draft |
| `PATCH` | `/returns/{return_id}/items/{item_id}/` | Edit quantity, reason, or details |
| `DELETE` | `/returns/{return_id}/items/{item_id}/` | Remove an item |
| `POST` | `/returns/{return_id}/items/{item_id}/evidence/` | Attach curated evidence |
| `DELETE` | `/returns/{return_id}/items/{item_id}/evidence/{evidence_id}/` | Remove evidence |
| `POST` | `/returns/{return_id}/submit/` | Submit or resubmit |

### Operations perspective

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/operations/returns/` | Search and filter the current visitor's non-draft queue |
| `GET` | `/operations/returns/{return_id}/` | Get request, items, evidence, and timeline |
| `POST` | `/operations/returns/{return_id}/transition/` | Request information, approve, or reject |

The queue endpoint returns summary rows. The detail endpoint supplies the
hierarchy required by the expandable table:

```text
request
└── items[]
    └── evidence[]
```

Supported operations filters in v1 are `search`, `status`, `ordering`, and
`page`. Search is limited to fictional customer name and display reference.

## 10. Write payloads

Status is never accepted by generic create or update payloads.

Catalog-backed draft creation:

```json
{
  "order_id": "3ce8a3de-d732-49bc-b1c4-1698091cf175",
  "items": [
    {
      "order_item_id": "ca385771-23f5-4da7-b7c7-35c1c5b21ab0",
      "quantity": 1,
      "reason": "DAMAGED",
      "details": "Fictional product damage."
    }
  ]
}
```

The server ignores no extra fields: attempts to supply customer identity,
product identity, price, status, or ownership fields are rejected.

Customer submission:

```json
{
  "response_note": "I added a clearer photo of the fictional item."
}
```

`response_note` is optional for the first submission and required when moving
from `NEEDS_INFORMATION` back to `SUBMITTED`.

Operations transition:

```json
{
  "target_status": "NEEDS_INFORMATION",
  "note": "Please add a photo of the fictional serial label."
}
```

The actor and source state are derived by the server. They are not accepted
from the payload.

## 11. Response and error semantics

- `200 OK`: successful read, update, reset, or transition.
- `201 Created`: draft, item, or evidence created.
- `204 No Content`: successful deletion.
- `400 Bad Request`: malformed input or field validation failure.
- `401 Unauthorized`: visitor bootstrap is required or expired.
- `403 Forbidden`: CSRF failure or a protected non-demo surface.
- `404 Not Found`: nonexistent or cross-visitor resource.
- `409 Conflict`: invalid/stale state transition or immutable aggregate.

Domain errors use stable codes so both locales can render their own messages:

```json
{
  "code": "invalid_status_transition",
  "detail": "This return cannot make the requested transition.",
  "fields": {}
}
```

`detail` is suitable for development and fallback display. The frontend should
prefer translated copy selected by `code`.

## 12. Required isolation and contract tests

The backend slice is not stable until PostgreSQL tests demonstrate all of the
following:

1. Two visitor sessions receive different sandboxes.
2. Visitor A cannot list visitor B's return.
3. Visitor A receives `404` when reading, editing, transitioning, or deleting a
   return owned by visitor B.
4. Cross-return and cross-visitor item/evidence identifiers cannot be used.
5. Operations never sees another visitor's data or the current visitor's
   drafts.
6. Reset recreates only the caller's dataset.
7. Expired visitors cannot access old data.
8. Generic writes cannot assign ownership, status, totals, event actors, or
   timestamps.
9. Each allowed transition updates the state and appends exactly one event in
   one transaction.
10. Invalid transitions leave both the request and timeline unchanged.
11. Required notes and submission prerequisites are enforced.
12. Terminal requests and status events are immutable through the public API.
13. Money, timestamps, state codes, pagination, search, and ordering follow
    this contract.

These tests must run against PostgreSQL before the Next.js application is
connected to the domain API.
