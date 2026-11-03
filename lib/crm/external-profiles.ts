import type { CrmExternalRecordType, CrmEventEnvelope } from "./contracts";

export type ExternalProfileProvider = "LINKEDIN_PERSON" | "LINKEDIN_COMPANY" | "GITHUB" | "WEBSITE" | "PORTFOLIO" | "X" | "OTHER";

export interface UrlOnlyExternalProfile {
  provider: ExternalProfileProvider;
  profileUrl: string;
  normalizedUrl: string;
  connectionStatus: "URL_ONLY";
}

const PRIVATE_IPV4 = /^(0|10|127)\.|^169\.254\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./;

function isUnsafeHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return lower === "localhost" || lower.endsWith(".localhost") || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:") || PRIVATE_IPV4.test(lower);
}

function providerFor(hostname: string, pathname: string): ExternalProfileProvider {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (host === "linkedin.com") return pathname.startsWith("/company/") ? "LINKEDIN_COMPANY" : "LINKEDIN_PERSON";
  if (host === "github.com") return "GITHUB";
  if (host === "x.com" || host === "twitter.com") return "X";
  return "WEBSITE";
}

/**
 * Validates and normalizes a link only. This function never performs HTTP,
 * DNS, HTML, metadata, or provider API requests, which prevents URL-entry
 * from becoming an SSRF or LinkedIn-scraping path.
 */
export function parseExternalProfileUrl(input: string): UrlOnlyExternalProfile {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("A complete HTTPS profile URL is required");
  }

  if (url.protocol !== "https:" || url.username || url.password || isUnsafeHostname(url.hostname)) {
    throw new Error("This profile URL is not allowed");
  }
  if (url.port && url.port !== "443") throw new Error("This profile URL is not allowed");

  url.hash = "";
  for (const key of [...url.searchParams.keys()]) url.searchParams.delete(key);
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";

  return {
    provider: providerFor(url.hostname, url.pathname),
    // Persist the canonical link rather than tracking parameters supplied by
    // a browser or external provider.
    profileUrl: url.toString(),
    normalizedUrl: url.toString(),
    connectionStatus: "URL_ONLY",
  };
}

export function externalProfileLinkedEvent(input: {
  id: string;
  organizationId: string;
  actorUserId: string;
  recordType: CrmExternalRecordType;
  recordId: string;
  profileId: string;
  normalizedUrl: string;
  occurredAt: string;
}): CrmEventEnvelope<{ recordType: CrmExternalRecordType; profileId: string; normalizedUrl: string }> {
  return {
    id: input.id,
    name: "crm.external_profile.linked.v1",
    version: 1,
    occurredAt: input.occurredAt,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    aggregate: { type: input.recordType, id: input.recordId },
    idempotencyKey: `external-profile-linked:${input.profileId}`,
    payload: { recordType: input.recordType, profileId: input.profileId, normalizedUrl: input.normalizedUrl },
  };
}
