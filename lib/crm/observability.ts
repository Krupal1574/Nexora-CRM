import * as Sentry from "@sentry/nextjs";

/**
 * CRM telemetry is intentionally metadata-only: never attach profile URLs,
 * names, email addresses, record content, provider tokens or request bodies.
 */
export function captureCrmException(error: unknown, context: {
  operation: string;
  organizationId?: string;
  actorUserId?: string;
  eventName?: string;
}): void {
  Sentry.withScope((scope) => {
    scope.setTag("module", "crm");
    scope.setTag("operation", context.operation);
    if (context.eventName) scope.setTag("event_name", context.eventName);
    scope.setContext("crm", {
      organizationId: context.organizationId,
      actorUserId: context.actorUserId,
    });
    Sentry.captureException(error);
  });
}
