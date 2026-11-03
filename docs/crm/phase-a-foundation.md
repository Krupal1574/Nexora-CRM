# Nexora CRM — Phase A foundation

## Scope and current architecture

The repository is a Next.js 16 / TypeScript application using NextAuth, PostgreSQL, Prisma schema files, a Prisma-8 runtime contract, and Sentry. Existing authorization is site-level (`User.role` is `CUSTOMER` or `ADMIN`) and current admin routes check that global role directly.

There is no existing shared organization, membership, team, granular-permission, workflow, or CRM service. `AdminAuditLog` is not tenant-scoped. Phase A therefore establishes the organization boundary and CRM contracts without changing existing site/admin behavior or creating a CRM interface.

The production data access runtime currently consumes `prisma8/contract.prisma`, while checked-in migrations and the legacy schema use `prisma/schema.prisma`. The Phase A migration and schema update are authoritative database proposals, but the Prisma-8 contract must be regenerated from the migrated database before repository code accesses these models. No application route accesses Phase A tables yet.

## Implemented foundation

- `Organization` and `OrganizationMembership`, with active membership as the only route to CRM access.
- `ExternalProfile` as URL-only, provider-neutral link storage. It deliberately contains no fetched LinkedIn data or raw provider payload.
- Tenant-scoped, append-only `CrmAuditEvent` and transactional `CrmOutboxEvent` tables.
- A framework-neutral contract/authorization module. Every CRM route, job, and realtime subscriber must obtain an active organization context before accessing a record.
- Sentry helper that only records operational metadata; it excludes CRM record bodies, profile URLs, names, emails, and provider credentials.
- Native TypeScript tests for cross-tenant reads and unsafe profile URLs.

## Safe external-profile baseline

`parseExternalProfileUrl` accepts only HTTPS URLs without credentials and rejects `file:`, `javascript:`, localhost, RFC1918 IPv4 ranges, loopback, and non-default ports. It strips fragment and query parameters before storing the canonical URL and identifies common providers.

It never performs DNS, HTTP, HTML metadata, or provider API requests. A LinkedIn URL results in `URL_ONLY`; there is no scraping, login automation, cookie use, or synthetic preview. A future approved-provider adapter may transition the stored status only after product, legal, and integration approval.

## Migration procedure (approval required)

1. Back up the production database and verify the deployed schema matches the existing Prisma migration history.
2. Apply `20261104090000_crm_phase_a_foundation` in a staging database.
3. Regenerate `prisma8/contract.prisma` and its generated artifacts from the migrated database; review the generated diff.
4. Seed one organization and explicit active memberships. Do **not** infer memberships from global `User.role`.
5. Run the tenant-isolation suite and a staging smoke test before enabling CRM routes.

## Phase A exit checkpoint

The data model, permissions, API/event contract, and tests are ready for product-owner review. CRM screens, lead/contact/company/deal data models, provider enrichment, and background event delivery remain intentionally out of scope.
