# Nexora CRM

Standalone CRM application workspace. It intentionally does not modify the public Nexora staffing site.

## Current state

- Phase A tenancy, permission, audit/outbox, and URL-only profile-link foundations are present.
- The leads workspace and dashboard are truthful setup states; they contain no sample customer data and do not create records before the CRM database is migrated.
- `GET /api/crm/status` exposes only non-sensitive service readiness information.
- The CRM is branded with the existing Nexora navy/orange identity and is designed for `app.nexorastaffingllp.com` after deployment.

## Local development

```powershell
npm install
npm run dev
npm run test:security
```

Before enabling lead creation, apply the approved CRM migrations in a staging PostgreSQL database, regenerate the Prisma runtime contract, seed an organization plus active memberships, and add server-side CRM route authorization.
