/**
 * CRM Phase A public contract. These values are deliberately framework-neutral
 * so route handlers, jobs and future WebSocket handlers enforce the same rules.
 */

export const CRM_PERMISSIONS = [
  "crm.dashboard.read",
  "crm.leads.read", "crm.leads.create", "crm.leads.update", "crm.leads.delete", "crm.leads.assign", "crm.leads.convert", "crm.leads.export", "crm.leads.import",
  "crm.contacts.read", "crm.contacts.create", "crm.contacts.update", "crm.contacts.delete", "crm.contacts.export", "crm.contacts.import",
  "crm.companies.read", "crm.companies.create", "crm.companies.update", "crm.companies.delete", "crm.companies.export", "crm.companies.import",
  "crm.deals.read", "crm.deals.create", "crm.deals.update", "crm.deals.delete", "crm.deals.assign", "crm.deals.change_stage", "crm.deals.close", "crm.deals.export",
  "crm.activities.read", "crm.activities.create", "crm.activities.update", "crm.activities.delete", "crm.activities.complete",
  "crm.pipelines.read", "crm.pipelines.manage", "crm.fields.manage", "crm.views.manage_shared", "crm.reports.read", "crm.settings.manage", "crm.audit.read",
  "crm.external_profiles.read", "crm.external_profiles.create", "crm.external_profiles.delete",
] as const;

export type CrmPermission = (typeof CRM_PERMISSIONS)[number];

export const CRM_RECORD_VISIBILITIES = ["ORGANIZATION", "TEAM", "OWNER", "SHARED"] as const;
export type CrmRecordVisibility = (typeof CRM_RECORD_VISIBILITIES)[number];

export const CRM_EXTERNAL_RECORD_TYPES = ["LEAD", "CONTACT", "COMPANY"] as const;
export type CrmExternalRecordType = (typeof CRM_EXTERNAL_RECORD_TYPES)[number];

export const CRM_MEMBERSHIP_ROLES = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"] as const;
export type CrmMembershipRole = (typeof CRM_MEMBERSHIP_ROLES)[number];

export interface CrmActorContext {
  organizationId: string;
  userId: string;
  membershipId: string;
  role: CrmMembershipRole;
  status: "ACTIVE";
  /** Explicit, server-validated additions to role grants. */
  grants: readonly CrmPermission[];
  teamIds?: readonly string[];
}

export interface TenantOwnedRecord {
  organizationId: string;
  ownerUserId?: string | null;
  visibility: CrmRecordVisibility;
  teamId?: string | null;
  sharedWithUserIds?: readonly string[];
}

export const CRM_EVENT_NAMES = [
  "crm.external_profile.linked.v1",
  "crm.external_profile.unlinked.v1",
  "crm.audit.recorded.v1",
] as const;

export type CrmEventName = (typeof CRM_EVENT_NAMES)[number];

export interface CrmEventEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  name: CrmEventName;
  version: 1;
  occurredAt: string;
  organizationId: string;
  actorUserId: string | null;
  aggregate: { type: string; id: string };
  idempotencyKey: string;
  payload: TPayload;
}
