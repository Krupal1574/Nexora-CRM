import type { CrmActorContext, CrmMembershipRole, CrmPermission, TenantOwnedRecord } from "./contracts";

const ALL_CRM_PERMISSIONS: readonly CrmPermission[] = [
  "crm.dashboard.read",
  "crm.leads.read", "crm.leads.create", "crm.leads.update", "crm.leads.delete", "crm.leads.assign", "crm.leads.convert", "crm.leads.export", "crm.leads.import",
  "crm.contacts.read", "crm.contacts.create", "crm.contacts.update", "crm.contacts.delete", "crm.contacts.export", "crm.contacts.import",
  "crm.companies.read", "crm.companies.create", "crm.companies.update", "crm.companies.delete", "crm.companies.export", "crm.companies.import",
  "crm.deals.read", "crm.deals.create", "crm.deals.update", "crm.deals.delete", "crm.deals.assign", "crm.deals.change_stage", "crm.deals.close", "crm.deals.export",
  "crm.activities.read", "crm.activities.create", "crm.activities.update", "crm.activities.delete", "crm.activities.complete",
  "crm.pipelines.read", "crm.pipelines.manage", "crm.fields.manage", "crm.views.manage_shared", "crm.reports.read", "crm.settings.manage", "crm.audit.read",
  "crm.external_profiles.read", "crm.external_profiles.create", "crm.external_profiles.delete",
];

const VIEWER_PERMISSIONS: readonly CrmPermission[] = [
  "crm.dashboard.read", "crm.leads.read", "crm.contacts.read", "crm.companies.read", "crm.deals.read", "crm.activities.read", "crm.pipelines.read", "crm.reports.read", "crm.external_profiles.read",
];

const MEMBER_PERMISSIONS: readonly CrmPermission[] = [
  ...VIEWER_PERMISSIONS,
  "crm.leads.create", "crm.leads.update", "crm.contacts.create", "crm.contacts.update", "crm.companies.create", "crm.companies.update", "crm.deals.create", "crm.deals.update", "crm.activities.create", "crm.activities.update", "crm.activities.complete", "crm.external_profiles.create", "crm.external_profiles.delete",
];

const MANAGER_PERMISSIONS: readonly CrmPermission[] = [
  ...MEMBER_PERMISSIONS,
  "crm.leads.assign", "crm.leads.convert", "crm.deals.assign", "crm.deals.change_stage", "crm.deals.close", "crm.activities.delete",
];

const ROLE_PERMISSIONS: Record<CrmMembershipRole, readonly CrmPermission[]> = {
  OWNER: ALL_CRM_PERMISSIONS,
  ADMIN: ALL_CRM_PERMISSIONS,
  MANAGER: MANAGER_PERMISSIONS,
  MEMBER: MEMBER_PERMISSIONS,
  VIEWER: VIEWER_PERMISSIONS,
};

export class CrmAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmAuthorizationError";
  }
}

export function hasCrmPermission(actor: CrmActorContext, permission: CrmPermission): boolean {
  return ROLE_PERMISSIONS[actor.role].includes(permission) || actor.grants.includes(permission);
}

/** Fails closed if a route forgets to constrain a read/write by organization. */
export function assertSameOrganization(actor: CrmActorContext, record: Pick<TenantOwnedRecord, "organizationId">): void {
  if (!actor.organizationId || actor.organizationId !== record.organizationId) {
    throw new CrmAuthorizationError("CRM tenant scope mismatch");
  }
}

/**
 * Record visibility always applies in addition to permission checks. For now a
 * manager can see team records only when their team membership is supplied by
 * the shared team service; absent team data is intentionally not treated as a
 * match.
 */
export function canReadCrmRecord(actor: CrmActorContext, record: TenantOwnedRecord, permission: CrmPermission): boolean {
  if (!hasCrmPermission(actor, permission)) return false;
  if (actor.organizationId !== record.organizationId) return false;

  switch (record.visibility) {
    case "ORGANIZATION":
      return true;
    case "OWNER":
      return record.ownerUserId === actor.userId;
    case "TEAM":
      return Boolean(record.teamId && actor.teamIds?.includes(record.teamId));
    case "SHARED":
      return record.ownerUserId === actor.userId || Boolean(record.sharedWithUserIds?.includes(actor.userId));
  }
}

export function requireCrmPermission(actor: CrmActorContext, permission: CrmPermission): void {
  if (!hasCrmPermission(actor, permission)) {
    throw new CrmAuthorizationError(`Missing CRM permission: ${permission}`);
  }
}
