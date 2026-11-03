# CRM API and event contracts — Phase A

All future routes use `/api/v1/crm`, authenticate through the existing session mechanism, resolve one active `OrganizationMembership`, and scope every database query with `organizationId`. IDs alone are never sufficient.

## URL-only external-profile endpoints (contract only)

| Method | Path | Permission | Phase A behavior |
| --- | --- | --- | --- |
| POST | `/records/:recordType/:recordId/external-profiles` | `crm.external_profiles.create` + record update | Validate and store an HTTPS URL as `URL_ONLY`; emit audit/outbox rows in the same transaction. |
| GET | `/records/:recordType/:recordId/external-profiles` | `crm.external_profiles.read` + record read | Return stored URL/provider/status only. |
| DELETE | `/external-profiles/:profileId` | `crm.external_profiles.delete` + record update | Unlink; emit an audit/outbox row. |
| GET | `/external-profiles/:profileId/preview` | `crm.external_profiles.read` + record read | Return a URL-only card. No remote retrieval in Phase A. |

`POST /refresh`, suggestion application, history snapshots, callbacks, and provider credentials are deferred until a compliant provider is approved. These paths must not be created as aliases for scraping.

## Responses and errors

Successful writes return `201` or `204`. Validation errors return `400`; missing/invalid active membership is `403`; cross-tenant IDs return `404` to avoid resource-existence leakage. Responses never include provider credentials, raw provider payloads, or hidden CRM fields.

## Transactional-outbox envelope

Every CRM domain event follows `CrmEventEnvelope` in `lib/crm/contracts.ts`.

```json
{
  "id": "event-id",
  "name": "crm.external_profile.linked.v1",
  "version": 1,
  "occurredAt": "2026-11-04T00:00:00.000Z",
  "organizationId": "org-id",
  "actorUserId": "user-id",
  "aggregate": { "type": "LEAD", "id": "lead-id" },
  "idempotencyKey": "external-profile-linked:profile-id",
  "payload": { "recordType": "LEAD", "profileId": "profile-id", "normalizedUrl": "https://www.linkedin.com/in/example" }
}
```

Outbox delivery is deferred until Nexora’s shared workflow infrastructure exists. Consumers must deduplicate by `organizationId + idempotencyKey`, preserve the version, and never use an event payload to override authorization.

## Observability requirements

- Use `captureCrmException` for exceptions with operation name and non-sensitive correlation IDs only.
- Log audit changes and enqueue events transactionally; do not put profile URLs, emails, contact data, request bodies, session tokens, or provider secrets in logs/Sentry.
- Track counts and latency by operation/status at the worker or route boundary once those boundaries are implemented.
