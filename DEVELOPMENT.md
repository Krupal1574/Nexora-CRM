# Nexora CRM Development Guide

## Purpose

Nexora CRM is a separate internal application for managing staffing relationships and work. It must remain independent from the public Nexora marketing website.

- CRM workspace: `C:\Users\Krupa\Downloads\Nexora\crm`
- Public website workspace: `C:\Users\Krupa\Downloads\Nexora\nexora-site`
- Planned CRM address: `app.nexorastaffingllp.com`

Do not move CRM code into the public website repository. Do not alter the public site's routes, branding assets, or deployment while working on CRM features.

## Product Principles

1. Keep Nexora's navy, white, and orange visual identity.
2. Build an internal staffing CRM, not a public-facing website.
3. Every business record must belong to one organisation (tenant).
4. Enforce organisation and role checks on the server; never rely only on the interface.
5. Start with safe external profile links. Store a URL and show a link preview only; do not scrape LinkedIn or any external site.
6. Prefer clear empty states to fake production data.

## Phase A: Foundation Scope

Phase A establishes the platform for later CRM modules. It does not deliver the full operational CRM.

Included:

- Tenant-aware organisation and membership data model.
- Role and permission model.
- Safe external profile URL validation and linking.
- Audit-event and outbox-event contracts.
- API route/module conventions.
- Basic dashboard, navigation, lead placeholder, and health route.
- Tenant-isolation tests and structured observability helpers.

Excluded until product-owner approval:

- Production database migration.
- Full lead, candidate, client, and job workflows.
- LinkedIn scraping, credential storage, or automatic enrichment.
- Email sending, document parsing, automation, billing, or public CRM pages.

## Planned CRM Areas

The interface should make these areas visible, even when a feature is labelled `Coming soon`.

| Area | Planned functions |
| --- | --- |
| Dashboard | Pipeline totals, follow-ups, tasks, activity, quick actions |
| Leads | Capture, assign, stage, source, notes, profile URLs |
| Candidates | Contact profile, skills, resume, availability, applications |
| Clients | Client companies, contacts, jobs, relationship history |
| Jobs | Openings, requirements, candidates, interview progress |
| Pipeline | Kanban stage movement, ownership, due dates, reminders |
| Tasks | Personal/team tasks, due dates, linked records |
| Profile links | Save and safely open LinkedIn/portfolio/company URLs; no scraping |
| Activity | Audit trail for material changes |
| Team & roles | Organisation members, membership status, permissions |
| Settings | Organisation, custom pipeline stages, integrations, security |

## Permission Model

Base roles are `OWNER`, `ADMIN`, `MANAGER`, `MEMBER`, and `VIEWER`.

- **Owner** — full organisation control, including membership and settings.
- **Admin** — manages records, team members, and configured CRM features.
- **Manager** — manages team workflows and assigned records.
- **Member** — works with permitted records and tasks.
- **Viewer** — read-only access to permitted records.

Fine-grained permission checks must be evaluated with the organisation ID, membership status, role, and explicit grants. No record may be returned, updated, or deleted before this check succeeds.

## Safe External Profile Links

For Phase A, external profiles are URL references only.

- Accept secure `https://` URLs only.
- Normalise the URL before saving.
- Reject embedded credentials, localhost, private network addresses, unsafe ports, queries, and fragments.
- Store the provider as `LINKEDIN`, `WEBSITE`, `PORTFOLIO`, `GITHUB`, or `OTHER` when known.
- Render an outbound link and an optional user-provided label.
- Never fetch a profile page server-side, scrape LinkedIn, bypass logins, or store a LinkedIn password/cookie.

Future enrichment must use an approved provider, an explicit user action, consent where required, rate limits, audit events, and a privacy review.

## Data Model Direction

The Phase A schema introduces these tenant-scoped foundation records:

- `Organization`
- `OrganizationMembership`
- `ExternalProfile`
- `CrmAuditEvent`
- `CrmOutboxEvent`

All later CRM entities—such as leads, candidates, clients, jobs, tasks, and notes—must include `organizationId`, useful indexes, and tenant-scoped uniqueness rules.

The proposed SQL migration is in:

`prisma/migrations/20261104090000_crm_phase_a_foundation/migration.sql`

Do not apply it directly to production. First test against a backed-up staging database, regenerate the Prisma client, run tenant-isolation tests, and obtain product-owner approval.

## API and Event Conventions

Every protected endpoint must:

1. Identify the authenticated user.
2. Resolve the active organisation.
3. Confirm the user has an active membership.
4. Check the required permission.
5. Query using `organizationId` as part of the filter.
6. Emit an audit event for material changes.
7. Queue an outbox event for asynchronous side effects.
8. Return safe errors without exposing other tenants' data.

Use the API/event definitions in `docs/crm/api-and-event-contracts.md` as the source of truth. Extend contracts before implementing a new module.

## Local Development

From the CRM folder:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

Before committing changes:

```powershell
npm run build
npm run test:security
git status
```

## Suggested Delivery Order After Phase A Approval

1. Connect a staging PostgreSQL database and validate migrations.
2. Implement authentication plus active-organisation selection.
3. Deliver Leads end-to-end: list, detail, create, edit, assignment, stages, notes, and URL-only profile links.
4. Add Clients and Candidates using the same tenant and audit patterns.
5. Add Jobs, submissions, and pipeline workflows.
6. Add task/reminder and notification workflows through the outbox.
7. Review privacy, permission coverage, observability, and backups before production rollout.

## Definition of Done for Any CRM Feature

- It is scoped to an organisation and tenant isolation is tested.
- Server-side permissions protect every read and write.
- Important changes create an audit event.
- Failures are observable without leaking sensitive details.
- The empty/loading/error states are designed.
- The feature uses real data or clearly says it is not connected yet.
- It does not modify the public Nexora website unless separately approved.

