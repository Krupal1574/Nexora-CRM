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

## Approved Bitrix-Equivalent Capability Scope

The supplied Bitrix screenshots define the functional benchmark for Nexora CRM. Nexora will implement equivalent workflows for staffing, with its own navy, white, and orange visual system and its own information architecture. Do not copy Bitrix assets, branding, screen layouts, or proprietary extensions.

### Leads workspace

- A lead list with saved views, search, filters, bulk selection, sortable columns, and pagination.
- List, kanban, activity, and calendar views.
- Staffing-specific fields such as candidate name, phone, email, source, visa/work authorisation, job role, lead stage, owner, created date, and next activity.
- A visible stage/progress indicator in list and kanban views.
- Quick create for a new lead and clear empty/loading/error states.
- Row actions: view, edit, duplicate, archive/delete (permission controlled), create an e-mail activity, schedule an activity, and convert.

### Lead conversion

An authorised user can convert a qualified lead into one or more linked CRM records:

- Candidate/contact
- Client company
- Hiring opportunity or deal
- Any valid combination of the above

Conversion must be idempotent, preserve lead history, record the actor and timestamp in the audit log, and prevent cross-organisation access.

### Lead record

- Editable general profile with contact details, job role, source, owner, tags, safe external-profile URLs, and custom fields.
- Configurable stage bar, for example: New, Resume received, Contacted, Follow-up, Qualified, Enrolled, Closed.
- Linked contacts, client/company, opportunities, submissions, products/services, and supporting documents when those modules are introduced.
- A complete timeline showing creation, field changes, stage changes, assignments, notes, activities, and conversions.
- An activity composer supporting task, call, e-mail draft/log, message log, meeting/visit, and video meeting link. Initial delivery may create activity records only; sending e-mail or messages requires a separately approved integration.

### Activities and planning

- Schedule and assign follow-up tasks, calls, interviews, meetings, and reminders.
- Show overdue, planned, and completed activities on dashboards and the lead record.
- Calendar and activity views filtered to the current organisation and permitted owners.
- Optional notification delivery through the transactional outbox, never directly from a database write.

### Automation and extensions

- Phase B+: configurable, tenant-scoped automation rules, such as assigning an owner when a lead enters a stage, creating a follow-up task, or notifying a manager.
- Rules must run asynchronously through the outbox, be idempotent, include audit visibility, and have organisation-admin controls.
- Third-party integrations remain disabled by default and must pass a privacy/security review. LinkedIn remains URL-only unless an approved, compliant enrichment provider is selected.

### Explicitly not copied from Bitrix

- Bitrix branding, imagery, navigation design, source code, extensions, marketplace apps, or user data.
- Unauthorised social-profile scraping, credential collection, or private API access.

## Delivery Sequence for the Bitrix-Equivalent Scope

1. **Leads core** — database model, create/edit/detail/list, stage pipeline, ownership, filters, and tenant tests.
2. **Activities** — tasks, calls, notes, reminders, activity timeline, and calendar views.
3. **Conversion** — candidate/contact, client company, and opportunity/deal creation with preserved history.
4. **Staffing modules** — candidates, clients, jobs, submissions, interviews, and placements.
5. **Automation** — trigger/rule builder, outbox workers, monitoring, retry policy, and admin controls.
6. **Communications/integrations** — only after provider selection, consent, permissions, and security review.

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

