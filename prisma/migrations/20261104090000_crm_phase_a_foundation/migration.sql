-- CRM Phase A: tenancy, URL-only profile links, audit trail and transactional outbox.
-- This migration intentionally does not create CRM business records (Lead, Contact,
-- Company, Deal). Those arrive in their respective vertical phases.

CREATE TYPE "OrganizationMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER');
CREATE TYPE "OrganizationMembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED');
CREATE TYPE "CrmExternalRecordType" AS ENUM ('LEAD', 'CONTACT', 'COMPANY');
CREATE TYPE "ExternalProfileProvider" AS ENUM ('LINKEDIN_PERSON', 'LINKEDIN_COMPANY', 'GITHUB', 'WEBSITE', 'PORTFOLIO', 'X', 'OTHER');
CREATE TYPE "ExternalProfileConnectionStatus" AS ENUM ('URL_ONLY', 'CONNECTED', 'PREVIEW_AVAILABLE', 'AUTH_REQUIRED', 'PROVIDER_UNAVAILABLE', 'ERROR');
CREATE TYPE "CrmAuditAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'LINKED', 'UNLINKED', 'EXPORTED', 'PERMISSION_CHANGED');
CREATE TYPE "CrmOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "locale" TEXT NOT NULL DEFAULT 'en',
  "defaultCurrency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMembership" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "OrganizationMembershipRole" NOT NULL DEFAULT 'MEMBER',
  "status" "OrganizationMembershipStatus" NOT NULL DEFAULT 'INVITED',
  "permissionGrants" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalProfile" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "recordType" "CrmExternalRecordType" NOT NULL,
  "recordId" TEXT NOT NULL,
  "provider" "ExternalProfileProvider" NOT NULL,
  "profileUrl" TEXT NOT NULL,
  "normalizedUrl" TEXT NOT NULL,
  "connectionStatus" "ExternalProfileConnectionStatus" NOT NULL DEFAULT 'URL_ONLY',
  "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  "externalProviderId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmAuditEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" "CrmAuditAction" NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmOutboxEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "eventVersion" INTEGER NOT NULL DEFAULT 1,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "CrmOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmOutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");
CREATE INDEX "OrganizationMembership_userId_status_idx" ON "OrganizationMembership"("userId", "status");
CREATE INDEX "OrganizationMembership_organizationId_status_role_idx" ON "OrganizationMembership"("organizationId", "status", "role");
CREATE UNIQUE INDEX "ExternalProfile_organizationId_recordType_recordId_normalizedUrl_key" ON "ExternalProfile"("organizationId", "recordType", "recordId", "normalizedUrl");
CREATE INDEX "ExternalProfile_organizationId_recordType_recordId_idx" ON "ExternalProfile"("organizationId", "recordType", "recordId");
CREATE INDEX "ExternalProfile_organizationId_provider_connectionStatus_idx" ON "ExternalProfile"("organizationId", "provider", "connectionStatus");
CREATE INDEX "CrmAuditEvent_organizationId_resourceType_resourceId_occurredAt_idx" ON "CrmAuditEvent"("organizationId", "resourceType", "resourceId", "occurredAt");
CREATE INDEX "CrmAuditEvent_organizationId_occurredAt_idx" ON "CrmAuditEvent"("organizationId", "occurredAt");
CREATE UNIQUE INDEX "CrmOutboxEvent_organizationId_idempotencyKey_key" ON "CrmOutboxEvent"("organizationId", "idempotencyKey");
CREATE INDEX "CrmOutboxEvent_status_availableAt_idx" ON "CrmOutboxEvent"("status", "availableAt");
CREATE INDEX "CrmOutboxEvent_organizationId_aggregateType_aggregateId_idx" ON "CrmOutboxEvent"("organizationId", "aggregateType", "aggregateId");

ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalProfile" ADD CONSTRAINT "ExternalProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalProfile" ADD CONSTRAINT "ExternalProfile_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmAuditEvent" ADD CONSTRAINT "CrmAuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmAuditEvent" ADD CONSTRAINT "CrmAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmOutboxEvent" ADD CONSTRAINT "CrmOutboxEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
