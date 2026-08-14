# ReturnOps platform API v1

The OpenAPI document is the machine-readable contract for the first ReturnOps
vertical slice. The domain and isolation rules remain normative in
[the returns contract](returns-domain-contract.md); this document explains how
a browser client uses the HTTP API.

## Documentation endpoints

With the backend running locally:

- OpenAPI YAML: <http://localhost:8000/api/v1/schema/>
- Swagger UI: <http://localhost:8000/api/v1/docs/>
- ReDoc: <http://localhost:8000/api/v1/redoc/>

The repository also tracks [a validated schema snapshot](openapi.yaml). Stable
operation IDs make that snapshot suitable for contract review and future
TypeScript client generation.

## Browser session and CSRF

The API does not accept a visitor UUID. A browser first calls the public
bootstrap endpoint with credentials enabled:

```ts
await fetch("http://localhost:8000/api/v1/session/", {
  credentials: "include",
});
```

Django responds with an opaque `returnops_sessionid` HttpOnly cookie and a
readable `returnops_csrftoken` cookie. All later requests include credentials.
`POST`, `PATCH`, and `DELETE` also copy the CSRF cookie value into the
`X-CSRFToken` header:

```ts
await fetch("http://localhost:8000/api/v1/demo/reset/", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "X-CSRFToken": csrfToken,
  },
  body: JSON.stringify({}),
});
```

The OpenAPI security schemes describe these two browser requirements. The
session UUID itself must never appear in an API path, query, header, or body.

## Public demo limits

Creating a new visitor sandbox is limited to 30 creations per hour per client
by default. Reusing an active browser session is not counted. Resetting the
fictional dataset is limited to 10 operations per hour per active visitor.
When a limit is exceeded, the API returns `429 Too Many Requests` in the same
error envelope and includes `Retry-After` when available. Both rates are
configurable through `RETURNOPS_BOOTSTRAP_THROTTLE_RATE` and
`RETURNOPS_RESET_THROTTLE_RATE`.

The initial deployment intentionally uses Django's local process cache because
it runs as one free backend instance. A future multi-instance deployment must
move these counters to a shared cache.

## Resource surface

| Perspective | Method and path | Purpose |
| --- | --- | --- |
| Public | `GET /api/v1/session/` | Bootstrap or resume the demo sandbox |
| Demo | `GET /api/v1/demo/orders/` | List unused eligible fictional orders |
| Demo | `POST /api/v1/demo/reset/` | Reset only the current visitor data |
| Energybil | `GET /api/v1/energybil/demo/` | Seed or retrieve the isolated meter-to-invoice scenario |
| Energybil | `POST /api/v1/energybil/demo/advance/` | Commit the next synchronous billing stage |
| Energybil | `POST /api/v1/energybil/demo/reset/` | Reset only the visitor's Energybil scenario |
| Customer | `GET, POST /api/v1/returns/` | List returns or create from catalog selections |
| Customer | `GET, DELETE /api/v1/returns/{id}/` | Read or delete a draft |
| Customer | `POST /api/v1/returns/{id}/submit/` | Submit or resubmit a return |
| Customer | Nested item and evidence routes | Maintain a mutable aggregate |
| Operations | `GET /api/v1/operations/returns/` | Search and filter the queue |
| Operations | `GET /api/v1/operations/returns/{id}/` | Read expanded request detail |
| Operations | `POST /api/v1/operations/returns/{id}/transition/` | Apply an allowed decision |

The exact request fields, enums, pagination envelope, response models, examples,
and status codes live in the OpenAPI schema rather than being duplicated here.
The Energybil state machine and simulation boundary are normative in the
[Energybil demo contract](energybil-domain-contract.md).

## Error envelope

Handled failures use one stable shape:

```json
{
  "code": "validation_error",
  "detail": "Request validation failed.",
  "fields": {
    "items": ["This list may not be empty."]
  }
}
```

`code` is intended for program logic and translation lookup. `detail` is a
fallback message. `fields` contains structured validation details and is empty
for non-validation failures.

## Validate and refresh the snapshot

After changing a route or serializer, rebuild the backend image and generate
the schema from the isolated versioned URL configuration:

```bash
docker compose build backend

docker compose run --rm --no-deps \
  --entrypoint python \
  -e DB_ENGINE=sqlite \
  -v "$PWD/docs:/docs" \
  backend manage.py spectacular \
  --urlconf returns.api.schema_urls \
  --validate \
  --file /docs/openapi.yaml
```

Schema generation must complete without warnings or validation errors. Review
the resulting diff as an API-contract change before committing it.
