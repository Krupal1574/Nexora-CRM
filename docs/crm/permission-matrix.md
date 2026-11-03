# CRM permission matrix

Permission checks are server-side and combined with organization and record-visibility checks. Hiding a control is never authorization. `User.role = ADMIN` remains an existing site role; it does not bypass CRM organization membership.

| Capability | Owner / Admin | Manager | Member | Viewer |
| --- | --- | --- | --- | --- |
| Read CRM dashboard and records | Yes | Yes | Yes | Yes, visibility applies |
| Create and edit own working records | Yes | Yes | Yes | No |
| Reassign leads/deals, convert lead, close deal | Yes | Yes | No | No |
| Configure pipelines, fields, settings, shared views | Yes | No | No | No |
| Delete records/activities | Yes | Activities only | No | No |
| Import/export | Yes | Explicit grant only | Explicit grant only | No |
| View audit events | Yes | Explicit grant only | No | No |
| Link/unlink an external profile URL | Yes | Yes | Yes | No |
| Enable a future enrichment provider | Organization integration admin only (Phase H) | No | No | No |

The canonical identifiers live in `lib/crm/contracts.ts`. A membership may receive an explicit additional allow-list grant; grants do not replace record visibility. Every call to `canReadCrmRecord` must supply the exact entity permission (for example, `crm.leads.read`); the helper has no generic default.

Record visibility defaults are a product-owner decision before Phase B:

- `ORGANIZATION`: any authorized member in the organization.
- `TEAM`: only a matching team membership, supplied by the future shared team service.
- `OWNER`: record owner only.
- `SHARED`: owner and explicitly shared users only.
