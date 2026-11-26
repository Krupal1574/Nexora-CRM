import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { DEFAULT_ORG_ID, ensureCrmSchema, query } from "@/lib/crm/db";

export const SECURITY_ALERT_RECIPIENTS: string[] = Array.from(
  new Set([
    ...(process.env.ADMIN_EMAIL || process.env.SECURITY_ALERT_EMAIL || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    "support@nexorastaffingllp.com",
  ])
);

export type SecurityEventType =
  | "IMPORT"
  | "EXPORT"
  | "GOOGLE_SHEET_SYNC"
  | "DUPLICATE_MERGE"
  | "CLIPBOARD_COPY"
  | "CLIPBOARD_CUT"
  | "SCREENSHOT_ATTEMPT"
  | "PRINT_ATTEMPT"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED";

export interface SecurityAlertInput {
  eventType: SecurityEventType;
  severity?: "info" | "warning" | "high";
  actorEmail?: string;
  actorName?: string;
  pagePath?: string;
  ipAddress?: string;
  userAgent?: string;
  details: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function dispatchEmail(subject: string, textBody: string, htmlBody: string): Promise<{ sent: boolean; status: string }> {
  const fromAddress =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.RESEND_FROM ||
    "Nexora CRM Security <noreply@nexorastaffingllp.com>";

  // Option 1: Resend HTTPS API
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: SECURITY_ALERT_RECIPIENTS,
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });
      if (res.ok) {
        return { sent: true, status: "sent_via_resend" };
      }
      const errText = await res.text().catch(() => "");
      return { sent: false, status: `resend_error_${res.status}: ${errText.slice(0, 140)}` };
    } catch (err: any) {
      return { sent: false, status: `resend_exception: ${err?.message || "unknown"}` };
    }
  }

  // Option 2: Nodemailer SMTP
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const port = Number(process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure: port === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      await transporter.sendMail({
        from: fromAddress,
        to: SECURITY_ALERT_RECIPIENTS.join(", "),
        subject,
        text: textBody,
        html: htmlBody,
      });
      return { sent: true, status: "sent_via_smtp" };
    } catch (err: any) {
      return { sent: false, status: `smtp_error: ${err?.message || "unknown"}` };
    }
  }

  return {
    sent: false,
    status: "logged_only (configure SMTP_HOST/SMTP_USER/SMTP_PASS or RESEND_API_KEY)",
  };
}

/**
 * Records a security/DLP/data-transfer event in PostgreSQL (`CrmSecurityEvent`)
 * and emails `support@nexorastaffingllp.com` when mail transport is configured.
 * Never throws so caller flows remain resilient.
 */
export async function sendSecurityAlert(input: SecurityAlertInput): Promise<{
  id: string;
  emailSent: boolean;
  emailStatus: string;
}> {
  const id = `sec_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
  const severity = input.severity || "warning";
  const actorEmail = input.actorEmail || "unknown";
  const actorName = input.actorName || "Unknown User";
  const pagePath = input.pagePath || "/";
  const ipAddress = input.ipAddress || "";
  const userAgent = input.userAgent || "";
  const timestamp = new Date().toISOString();

  const subject = `[Nexora CRM Security Alert] ${input.eventType} — ${actorName} (${actorEmail})`;
  const textBody = [
    `Nexora CRM Security & Data Protection Alert`,
    `--------------------------------------------------`,
    `Event:      ${input.eventType}`,
    `Severity:   ${severity.toUpperCase()}`,
    `User:       ${actorName} (${actorEmail})`,
    `Page/Route: ${pagePath}`,
    `IP Address: ${ipAddress || "N/A"}`,
    `Timestamp:  ${timestamp}`,
    `Details:    ${input.details}`,
  ].join("\n");

  const htmlBody = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;">
      <div style="background:#203548;color:#ffffff;padding:16px 20px;">
        <h2 style="margin:0;font-size:16px;">Nexora CRM — Security &amp; Data Alert</h2>
      </div>
      <div style="padding:18px 20px;background:#ffffff;color:#171717;font-size:14px;line-height:1.5;">
        <p style="margin-top:0;">A monitored security or data-transfer event occurred in Nexora CRM:</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:6px 0;color:#77736d;width:130px;"><strong>Event Type</strong></td><td><strong>${escapeHtml(input.eventType)}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#77736d;"><strong>Severity</strong></td><td>${escapeHtml(severity.toUpperCase())}</td></tr>
          <tr><td style="padding:6px 0;color:#77736d;"><strong>User</strong></td><td>${escapeHtml(actorName)} (${escapeHtml(actorEmail)})</td></tr>
          <tr><td style="padding:6px 0;color:#77736d;"><strong>Page / Route</strong></td><td>${escapeHtml(pagePath)}</td></tr>
          <tr><td style="padding:6px 0;color:#77736d;"><strong>IP Address</strong></td><td>${escapeHtml(ipAddress || "N/A")}</td></tr>
          <tr><td style="padding:6px 0;color:#77736d;"><strong>Timestamp</strong></td><td>${escapeHtml(timestamp)}</td></tr>
          <tr><td style="padding:6px 0;color:#77736d;"><strong>Details</strong></td><td>${escapeHtml(input.details)}</td></tr>
        </table>
      </div>
      <div style="background:#f5f1e8;color:#77736d;padding:10px 20px;font-size:12px;">
        Sent to ${SECURITY_ALERT_RECIPIENTS.map(e => escapeHtml(e)).join(", ")} • Nexora Staffing LLP
      </div>
    </div>
  `;

  let mailResult = { sent: false, status: "pending" };
  try {
    mailResult = await dispatchEmail(subject, textBody, htmlBody);
  } catch (err: any) {
    mailResult = { sent: false, status: err?.message || "dispatch_failed" };
  }

  try {
    await ensureCrmSchema();
    await query(
      `
        INSERT INTO "CrmSecurityEvent" (
          "id", "organizationId", "eventType", "severity", "actorEmail", "actorName",
          "pagePath", "ipAddress", "userAgent", "details", "emailSent", "emailStatus"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        id,
        DEFAULT_ORG_ID,
        input.eventType,
        severity,
        actorEmail,
        actorName,
        pagePath,
        ipAddress,
        userAgent.slice(0, 300),
        input.details.slice(0, 1000),
        mailResult.sent,
        mailResult.status,
      ]
    );
  } catch (dbErr) {
    console.error("Failed to record CrmSecurityEvent:", dbErr);
  }

  return {
    id,
    emailSent: mailResult.sent,
    emailStatus: mailResult.status,
  };
}
