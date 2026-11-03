import assert from "node:assert/strict";
import test from "node:test";
import { canReadCrmRecord, CrmAuthorizationError, assertSameOrganization } from "../../lib/crm/authorization.ts";
import { parseExternalProfileUrl } from "../../lib/crm/external-profiles.ts";

const actor = {
  organizationId: "org-a",
  userId: "user-a",
  membershipId: "membership-a",
  role: "MEMBER" as const,
  status: "ACTIVE" as const,
  grants: [],
};

test("cross-tenant records are never readable", () => {
  assert.equal(canReadCrmRecord(actor, { organizationId: "org-b", visibility: "ORGANIZATION" }, "crm.leads.read"), false);
  assert.throws(() => assertSameOrganization(actor, { organizationId: "org-b" }), CrmAuthorizationError);
});

test("owner-only and explicitly shared records require the correct user", () => {
  assert.equal(canReadCrmRecord(actor, { organizationId: "org-a", visibility: "OWNER", ownerUserId: "user-b" }, "crm.contacts.read"), false);
  assert.equal(canReadCrmRecord(actor, { organizationId: "org-a", visibility: "SHARED", ownerUserId: "user-b", sharedWithUserIds: ["user-a"] }, "crm.contacts.read"), true);
});

test("URL-only profile linking recognizes LinkedIn without fetching it", () => {
  assert.deepEqual(parseExternalProfileUrl("https://www.linkedin.com/in/jane-doe/?trk=public_profile"), {
    provider: "LINKEDIN_PERSON",
    profileUrl: "https://www.linkedin.com/in/jane-doe",
    normalizedUrl: "https://www.linkedin.com/in/jane-doe",
    connectionStatus: "URL_ONLY",
  });
});

test("profile links reject non-web and private-network targets", () => {
  assert.throws(() => parseExternalProfileUrl("file:///etc/passwd"));
  assert.throws(() => parseExternalProfileUrl("https://127.0.0.1/private"));
  assert.throws(() => parseExternalProfileUrl("https://localhost/profile"));
  assert.throws(() => parseExternalProfileUrl("https://[::1]/profile"));
});
