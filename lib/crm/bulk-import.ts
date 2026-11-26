import crypto from "node:crypto";
import type { PoolClient } from "pg";
import { DEFAULT_ORG_ID, ensureCrmSchema, withTransaction } from "@/lib/crm/db";
import {
  analyzeImportDuplicates,
  DEFAULT_DUPLICATE_OPTIONS,
  type DedupeComparableRecord,
  type DuplicateMatchOptions,
} from "@/lib/crm/duplicates";
import { matchLeadStage, type NormalizedImportRow } from "@/lib/crm/import-utils";

export type DuplicateStrategy = "skip" | "update" | "allow";

export interface BulkImportInput {
  targetType: "leads" | "candidates";
  rows: NormalizedImportRow[];
  duplicateMode?: DuplicateStrategy;
  matchOptions?: DuplicateMatchOptions;
  sourceName?: string;
  actor?: string;
  actionType?: "Import" | "Google Sheet Sync";
}

export interface BulkImportSummary {
  totalReceived: number;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  dbDuplicateCount: number;
  fileDuplicateCount: number;
}

const CHUNK_SIZE = 150;

function deriveTemperature(leadType?: string): string {
  const lower = (leadType || "").toLowerCase();
  if (lower.includes("hot")) return "Hot";
  if (lower.includes("warm")) return "Warm";
  return "New";
}

async function insertLeadChunk(client: PoolClient, items: NormalizedImportRow[]) {
  if (items.length === 0) return;

  const cols = [
    "id",
    "organizationId",
    "name",
    "company",
    "title",
    "email",
    "phone",
    "linkedin",
    "stage",
    "temperature",
    "source",
    "owner",
    "visaStatus",
    "experience",
    "leadType",
    "leadSource",
    "leadPerson",
    "salesPerson",
    "technology",
    "accountRef",
    "remark",
    "location",
    "date",
  ];

  const values: any[] = [];
  const placeholders: string[] = [];

  items.forEach((row) => {
    const id = `lead_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
    const stage = matchLeadStage(row.stage || "");
    const temp = deriveTemperature(row.leadType);
    const salesPerson = row.salesPerson || "Support Admin";
    const leadSource = row.leadSource || "Spreadsheet Import";

    const tuple = [
      id,
      DEFAULT_ORG_ID,
      row.name || "Untitled Lead",
      row.company || row.accountRef || row.technology || "Independent Candidate",
      row.technology || "",
      row.email || "",
      row.phone || "",
      row.linkedin || "",
      stage,
      temp,
      leadSource,
      salesPerson,
      row.visaStatus || "",
      row.experience || "",
      row.leadType || "Cold Lead",
      leadSource,
      row.leadPerson || "Yatri",
      salesPerson,
      row.technology || "",
      row.accountRef || "",
      row.remark || "",
      row.location || "USA",
      row.date || new Date().toISOString().split("T")[0],
    ];

    const startIdx = values.length;
    values.push(...tuple);
    const group = tuple.map((_, idx) => `$${startIdx + idx + 1}`).join(", ");
    placeholders.push(`(${group})`);
  });

  const sql = `
    INSERT INTO "CrmLead" (${cols.map((c) => `"${c}"`).join(", ")})
    VALUES ${placeholders.join(", ")}
  `;
  await client.query(sql, values);
}

async function updateExistingLead(
  client: PoolClient,
  id: string,
  row: NormalizedImportRow
) {
  await client.query(
    `
      UPDATE "CrmLead"
      SET
        "email" = COALESCE(NULLIF("email", ''), $3),
        "phone" = COALESCE(NULLIF("phone", ''), $4),
        "linkedin" = COALESCE(NULLIF("linkedin", ''), $5),
        "visaStatus" = COALESCE(NULLIF("visaStatus", ''), $6),
        "experience" = COALESCE(NULLIF("experience", ''), $7),
        "technology" = COALESCE(NULLIF("technology", ''), $8),
        "location" = COALESCE(NULLIF("location", ''), $9),
        "accountRef" = COALESCE(NULLIF("accountRef", ''), $10),
        "leadSource" = COALESCE(NULLIF("leadSource", ''), $11),
        "leadPerson" = COALESCE(NULLIF("leadPerson", ''), $12),
        "salesPerson" = COALESCE(NULLIF("salesPerson", ''), $13),
        "remark" = CASE
          WHEN NULLIF("remark", '') IS NULL THEN $14
          WHEN $14 <> '' AND POSITION($14 IN "remark") = 0 THEN "remark" || ' | ' || $14
          ELSE "remark"
        END,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $1 AND "organizationId" = $2
    `,
    [
      id,
      DEFAULT_ORG_ID,
      row.email || "",
      row.phone || "",
      row.linkedin || "",
      row.visaStatus || "",
      row.experience || "",
      row.technology || "",
      row.location || "",
      row.accountRef || "",
      row.leadSource || "",
      row.leadPerson || "",
      row.salesPerson || "",
      row.remark || "",
    ]
  );
}

async function insertCandidateChunk(client: PoolClient, items: NormalizedImportRow[]) {
  if (items.length === 0) return;

  const cols = [
    "id",
    "organizationId",
    "name",
    "role",
    "location",
    "stage",
    "experience",
    "email",
    "phone",
    "profileUrl",
    "source",
    "skills",
    "notes",
  ];

  const values: any[] = [];
  const placeholders: string[] = [];

  items.forEach((row) => {
    const id = `cand_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
    const role = row.technology || "Staffing Candidate";
    const skills = JSON.stringify(
      role
        .split(/[,/|]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6)
    );

    const tuple = [
      id,
      DEFAULT_ORG_ID,
      row.name || "Imported Candidate",
      role,
      row.location || "Remote",
      row.stage && ["New", "Screening", "Interview", "Offer", "Placed"].includes(row.stage)
        ? row.stage
        : "New",
      row.experience || "",
      row.email || "",
      row.phone || "",
      row.linkedin || "",
      row.leadSource || "Spreadsheet Import",
      skills,
      row.remark || "",
    ];

    const startIdx = values.length;
    values.push(...tuple);
    const group = tuple.map((_, idx) => `$${startIdx + idx + 1}`).join(", ");
    placeholders.push(`(${group})`);
  });

  const sql = `
    INSERT INTO "CrmCandidate" (${cols.map((c) => `"${c}"`).join(", ")})
    VALUES ${placeholders.join(", ")}
  `;
  await client.query(sql, values);
}

async function updateExistingCandidate(
  client: PoolClient,
  id: string,
  row: NormalizedImportRow
) {
  await client.query(
    `
      UPDATE "CrmCandidate"
      SET
        "email" = COALESCE(NULLIF("email", ''), $3),
        "phone" = COALESCE(NULLIF("phone", ''), $4),
        "profileUrl" = COALESCE(NULLIF("profileUrl", ''), $5),
        "role" = COALESCE(NULLIF("role", ''), $6),
        "location" = COALESCE(NULLIF("location", ''), $7),
        "experience" = COALESCE(NULLIF("experience", ''), $8),
        "notes" = CASE
          WHEN NULLIF("notes", '') IS NULL THEN $9
          WHEN $9 <> '' AND POSITION($9 IN "notes") = 0 THEN "notes" || ' | ' || $9
          ELSE "notes"
        END,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $1 AND "organizationId" = $2
    `,
    [
      id,
      DEFAULT_ORG_ID,
      row.email || "",
      row.phone || "",
      row.linkedin || "",
      row.technology || "",
      row.location || "",
      row.experience || "",
      row.remark || "",
    ]
  );
}

export async function recordImportLog(
  client: PoolClient,
  params: {
    actionType: string;
    targetType: string;
    sourceName: string;
    addedCount: number;
    updatedCount: number;
    skippedCount: number;
    actor: string;
    details?: string;
  }
) {
  const id = `implog_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
  await client.query(
    `
      INSERT INTO "CrmImportLog" (
        "id", "organizationId", "actionType", "targetType", "sourceName",
        "addedCount", "updatedCount", "skippedCount", "actor", "details"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      id,
      DEFAULT_ORG_ID,
      params.actionType,
      params.targetType,
      params.sourceName,
      params.addedCount,
      params.updatedCount,
      params.skippedCount,
      params.actor,
      params.details || "",
    ]
  );
}

export async function executeBulkImport(input: BulkImportInput): Promise<BulkImportSummary> {
  await ensureCrmSchema();

  const targetType = input.targetType;
  const duplicateMode: DuplicateStrategy = input.duplicateMode ?? "skip";
  const matchOptions: DuplicateMatchOptions = input.matchOptions ?? DEFAULT_DUPLICATE_OPTIONS;
  const rows = (input.rows || []).filter((r) => r && r.name && r.name.trim().length > 0);

  return withTransaction(async (client) => {
    const existingRes =
      targetType === "leads"
        ? await client.query<DedupeComparableRecord>(
            `SELECT "id", "name", "email", "phone", "linkedin" FROM "CrmLead" WHERE "organizationId" = $1`,
            [DEFAULT_ORG_ID]
          )
        : await client.query<DedupeComparableRecord>(
            `SELECT "id", "name", "email", "phone", "profileUrl" AS "linkedin" FROM "CrmCandidate" WHERE "organizationId" = $1`,
            [DEFAULT_ORG_ID]
          );

    const analysis = analyzeImportDuplicates(rows, existingRes.rows, matchOptions);

    const toInsert: NormalizedImportRow[] = [];
    const toUpdate: { id: string; row: NormalizedImportRow }[] = [];
    let skippedCount = 0;

    for (const item of analysis.items) {
      if (item.status === "new") {
        toInsert.push(item.row);
      } else if (item.status === "db_duplicate") {
        if (duplicateMode === "allow") {
          toInsert.push(item.row);
        } else if (duplicateMode === "update" && item.matchedExistingId) {
          toUpdate.push({ id: item.matchedExistingId, row: item.row });
        } else {
          skippedCount++;
        }
      } else {
        // file_duplicate
        if (duplicateMode === "allow") {
          toInsert.push(item.row);
        } else {
          skippedCount++;
        }
      }
    }

    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE);
      if (targetType === "leads") {
        await insertLeadChunk(client, chunk);
      } else {
        await insertCandidateChunk(client, chunk);
      }
    }

    for (const upd of toUpdate) {
      if (targetType === "leads") {
        await updateExistingLead(client, upd.id, upd.row);
      } else {
        await updateExistingCandidate(client, upd.id, upd.row);
      }
    }

    await recordImportLog(client, {
      actionType: input.actionType || "Import",
      targetType: targetType === "leads" ? "Leads" : "Candidates",
      sourceName: input.sourceName || "Spreadsheet Import",
      addedCount: toInsert.length,
      updatedCount: toUpdate.length,
      skippedCount,
      actor: input.actor || "Support Admin",
      details: `Mode: ${duplicateMode} | DB dups: ${analysis.dbDuplicateCount}, Batch dups: ${analysis.fileDuplicateCount}`,
    });

    return {
      totalReceived: rows.length,
      addedCount: toInsert.length,
      updatedCount: toUpdate.length,
      skippedCount,
      dbDuplicateCount: analysis.dbDuplicateCount,
      fileDuplicateCount: analysis.fileDuplicateCount,
    };
  });
}
