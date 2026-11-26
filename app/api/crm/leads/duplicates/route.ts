import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_ORG_ID, ensureCrmSchema, query, withTransaction } from "@/lib/crm/db";
import { recordImportLog } from "@/lib/crm/bulk-import";
import {
  DEFAULT_DUPLICATE_OPTIONS,
  findDuplicateClusters,
  type DedupeComparableRecord,
  type DuplicateMatchOptions,
} from "@/lib/crm/duplicates";

export const dynamic = "force-dynamic";

function parseMatchOptions(searchParams: URLSearchParams): DuplicateMatchOptions {
  return {
    matchByEmail: searchParams.get("email") !== "false",
    matchByPhone: searchParams.get("phone") !== "false",
    matchByLinkedin: searchParams.get("linkedin") !== "false",
    matchByName: searchParams.get("name") === "true",
    ignorePlaceholders: searchParams.get("ignorePlaceholders") !== "false",
  };
}

export async function GET(req: NextRequest) {
  try {
    await ensureCrmSchema();
    const { searchParams } = new URL(req.url);
    const target = searchParams.get("target") === "candidates" ? "candidates" : "leads";
    const options = parseMatchOptions(searchParams);

    const rows =
      target === "leads"
        ? await query<DedupeComparableRecord>(
            `SELECT "id", "name", "email", "phone", "linkedin", "technology", "location",
                    "visaStatus", "experience", "leadType", "leadSource", "leadPerson",
                    "salesPerson", "accountRef", "remark", "stage", "date", "createdAt"
             FROM "CrmLead"
             WHERE "organizationId" = $1
             ORDER BY "createdAt" DESC`,
            [DEFAULT_ORG_ID]
          )
        : await query<DedupeComparableRecord>(
            `SELECT "id", "name", "email", "phone", "profileUrl" AS "linkedin", "role" AS "technology",
                    "location", "experience", "source" AS "leadSource", "notes" AS "remark",
                    "stage", "createdAt"
             FROM "CrmCandidate"
             WHERE "organizationId" = $1
             ORDER BY "createdAt" DESC`,
            [DEFAULT_ORG_ID]
          );

    const clusters = findDuplicateClusters(rows, options);
    const duplicateRowsCount = clusters.reduce((acc, c) => acc + c.duplicates.length, 0);

    return NextResponse.json({
      success: true,
      target,
      totalRecords: rows.length,
      clusterCount: clusters.length,
      duplicateRowsCount,
      clusters,
    });
  } catch (err: any) {
    console.error("GET /api/crm/leads/duplicates error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Duplicate scan failed." }, { status: 500 });
  }
}

function mergeClusterFields(records: DedupeComparableRecord[]) {
  const primary = records[0];
  const pickFirst = (getter: (r: DedupeComparableRecord) => string | null | undefined) => {
    for (const r of records) {
      const val = (getter(r) || "").trim();
      if (val) return val;
    }
    return "";
  };

  const uniqueRemarks: string[] = [];
  records.forEach((r) => {
    const rm = (r.remark || "").trim();
    if (rm && !uniqueRemarks.some((u) => u.includes(rm) || rm.includes(u))) {
      uniqueRemarks.push(rm);
    }
  });

  return {
    name: primary.name,
    email: pickFirst((r) => r.email),
    phone: pickFirst((r) => r.phone),
    linkedin: pickFirst((r) => r.linkedin || r.profileUrl),
    technology: pickFirst((r) => r.technology || r.role),
    location: pickFirst((r) => r.location),
    visaStatus: pickFirst((r) => r.visaStatus),
    experience: pickFirst((r) => r.experience),
    leadSource: pickFirst((r) => r.leadSource),
    leadPerson: pickFirst((r) => r.leadPerson),
    salesPerson: pickFirst((r) => r.salesPerson),
    accountRef: pickFirst((r) => r.accountRef),
    remark: uniqueRemarks.join(" | "),
  };
}

export async function POST(req: NextRequest) {
  try {
    await ensureCrmSchema();
    const body = await req.json();
    const action = body.action as "merge" | "delete" | "auto_merge";
    const target = body.target === "candidates" ? "candidates" : "leads";
    const actor = body.actor || "Support Admin";

    if (action === "merge") {
      const primaryId = String(body.primaryId || "");
      const duplicateIds: string[] = Array.isArray(body.duplicateIds)
        ? body.duplicateIds.filter((id: string) => id && id !== primaryId)
        : [];

      if (!primaryId || duplicateIds.length === 0) {
        return NextResponse.json({ success: false, error: "Primary ID and duplicate IDs are required." }, { status: 400 });
      }

      const result = await withTransaction(async (client) => {
        if (target === "leads") {
          const rowsRes = await client.query<DedupeComparableRecord>(
            `SELECT * FROM "CrmLead" WHERE "organizationId" = $1 AND "id" = ANY($2::text[])`,
            [DEFAULT_ORG_ID, [primaryId, ...duplicateIds]]
          );
          const ordered = [
            ...rowsRes.rows.filter((r) => r.id === primaryId),
            ...rowsRes.rows.filter((r) => r.id !== primaryId),
          ];
          if (ordered.length === 0) throw new Error("Primary record not found.");

          const merged = { ...mergeClusterFields(ordered), ...(body.mergedFields || {}) };
          await client.query(
            `UPDATE "CrmLead"
             SET "email" = $3, "phone" = $4, "linkedin" = $5, "technology" = $6,
                 "location" = $7, "visaStatus" = $8, "experience" = $9,
                 "leadSource" = $10, "leadPerson" = $11, "salesPerson" = $12,
                 "accountRef" = $13, "remark" = $14, "updatedAt" = CURRENT_TIMESTAMP
             WHERE "id" = $1 AND "organizationId" = $2`,
            [
              primaryId,
              DEFAULT_ORG_ID,
              merged.email || "",
              merged.phone || "",
              merged.linkedin || "",
              merged.technology || "",
              merged.location || "USA",
              merged.visaStatus || "",
              merged.experience || "",
              merged.leadSource || "",
              merged.leadPerson || "Yatri",
              merged.salesPerson || "Support Admin",
              merged.accountRef || "",
              merged.remark || "",
            ]
          );

          await client.query(
            `UPDATE "CrmNote" SET "recordId" = $3 WHERE "organizationId" = $1 AND "recordType" = 'lead' AND "recordId" = ANY($2::text[])`,
            [DEFAULT_ORG_ID, duplicateIds, primaryId]
          );

          const delRes = await client.query(
            `DELETE FROM "CrmLead" WHERE "organizationId" = $1 AND "id" = ANY($2::text[])`,
            [DEFAULT_ORG_ID, duplicateIds]
          );

          await recordImportLog(client, {
            actionType: "Deduplicate",
            targetType: "Leads",
            sourceName: `Merged ${ordered[0].name}`,
            addedCount: 0,
            updatedCount: 1,
            skippedCount: delRes.rowCount || duplicateIds.length,
            actor,
            details: `Kept ${primaryId}, removed ${duplicateIds.length} duplicate(s)`,
          });

          return { mergedCount: 1, deletedCount: delRes.rowCount || duplicateIds.length };
        } else {
          const rowsRes = await client.query<DedupeComparableRecord>(
            `SELECT "id", "name", "email", "phone", "profileUrl" AS "linkedin", "role" AS "technology",
                    "location", "experience", "source" AS "leadSource", "notes" AS "remark"
             FROM "CrmCandidate" WHERE "organizationId" = $1 AND "id" = ANY($2::text[])`,
            [DEFAULT_ORG_ID, [primaryId, ...duplicateIds]]
          );
          const ordered = [
            ...rowsRes.rows.filter((r) => r.id === primaryId),
            ...rowsRes.rows.filter((r) => r.id !== primaryId),
          ];
          if (ordered.length === 0) throw new Error("Primary candidate not found.");
          const merged = { ...mergeClusterFields(ordered), ...(body.mergedFields || {}) };

          await client.query(
            `UPDATE "CrmCandidate"
             SET "email" = $3, "phone" = $4, "profileUrl" = $5, "role" = $6,
                 "location" = $7, "experience" = $8, "source" = $9, "notes" = $10,
                 "updatedAt" = CURRENT_TIMESTAMP
             WHERE "id" = $1 AND "organizationId" = $2`,
            [
              primaryId,
              DEFAULT_ORG_ID,
              merged.email || "",
              merged.phone || "",
              merged.linkedin || "",
              merged.technology || "Staffing Candidate",
              merged.location || "Remote",
              merged.experience || "",
              merged.leadSource || "",
              merged.remark || "",
            ]
          );

          const delRes = await client.query(
            `DELETE FROM "CrmCandidate" WHERE "organizationId" = $1 AND "id" = ANY($2::text[])`,
            [DEFAULT_ORG_ID, duplicateIds]
          );

          await recordImportLog(client, {
            actionType: "Deduplicate",
            targetType: "Candidates",
            sourceName: `Merged ${ordered[0].name}`,
            addedCount: 0,
            updatedCount: 1,
            skippedCount: delRes.rowCount || duplicateIds.length,
            actor,
            details: `Kept ${primaryId}, removed ${duplicateIds.length} duplicate(s)`,
          });

          return { mergedCount: 1, deletedCount: delRes.rowCount || duplicateIds.length };
        }
      });

      return NextResponse.json({ success: true, ...result });
    }

    if (action === "delete") {
      const duplicateIds: string[] = Array.isArray(body.duplicateIds) ? body.duplicateIds : [];
      if (duplicateIds.length === 0) {
        return NextResponse.json({ success: false, error: "No duplicate IDs specified." }, { status: 400 });
      }

      const deletedCount = await withTransaction(async (client) => {
        const table = target === "leads" ? "CrmLead" : "CrmCandidate";
        const delRes = await client.query(
          `DELETE FROM "${table}" WHERE "organizationId" = $1 AND "id" = ANY($2::text[])`,
          [DEFAULT_ORG_ID, duplicateIds]
        );
        await recordImportLog(client, {
          actionType: "Deduplicate",
          targetType: target === "leads" ? "Leads" : "Candidates",
          sourceName: "Manual Duplicate Removal",
          addedCount: 0,
          updatedCount: 0,
          skippedCount: delRes.rowCount || 0,
          actor,
          details: `Deleted ${delRes.rowCount || 0} duplicate record(s)`,
        });
        return delRes.rowCount || 0;
      });

      return NextResponse.json({ success: true, deletedCount });
    }

    if (action === "auto_merge") {
      const options: DuplicateMatchOptions = body.matchOptions || {
        ...DEFAULT_DUPLICATE_OPTIONS,
        matchByName: false,
      };

      const summary = await withTransaction(async (client) => {
        const rowsRes =
          target === "leads"
            ? await client.query<DedupeComparableRecord>(
                `SELECT "id", "name", "email", "phone", "linkedin", "technology", "location",
                        "visaStatus", "experience", "leadType", "leadSource", "leadPerson",
                        "salesPerson", "accountRef", "remark", "stage", "date", "createdAt"
                 FROM "CrmLead" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC`,
                [DEFAULT_ORG_ID]
              )
            : await client.query<DedupeComparableRecord>(
                `SELECT "id", "name", "email", "phone", "profileUrl" AS "linkedin", "role" AS "technology",
                        "location", "experience", "source" AS "leadSource", "notes" AS "remark", "stage", "createdAt"
                 FROM "CrmCandidate" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC`,
                [DEFAULT_ORG_ID]
              );

        const clusters = findDuplicateClusters(rowsRes.rows, options).filter(
          (c) => c.confidence === "high"
        );

        let mergedClusters = 0;
        const allIdsToDelete: string[] = [];

        for (const cluster of clusters) {
          const merged = mergeClusterFields(cluster.records);
          const dupIds = cluster.duplicates.map((d) => d.id);
          allIdsToDelete.push(...dupIds);

          if (target === "leads") {
            await client.query(
              `UPDATE "CrmLead"
               SET "email" = $3, "phone" = $4, "linkedin" = $5, "technology" = $6,
                   "location" = $7, "visaStatus" = $8, "experience" = $9,
                   "leadSource" = $10, "leadPerson" = $11, "salesPerson" = $12,
                   "accountRef" = $13, "remark" = $14, "updatedAt" = CURRENT_TIMESTAMP
               WHERE "id" = $1 AND "organizationId" = $2`,
              [
                cluster.primary.id,
                DEFAULT_ORG_ID,
                merged.email,
                merged.phone,
                merged.linkedin,
                merged.technology,
                merged.location || "USA",
                merged.visaStatus,
                merged.experience,
                merged.leadSource,
                merged.leadPerson || "Yatri",
                merged.salesPerson || "Support Admin",
                merged.accountRef,
                merged.remark,
              ]
            );
            await client.query(
              `UPDATE "CrmNote" SET "recordId" = $3 WHERE "organizationId" = $1 AND "recordType" = 'lead' AND "recordId" = ANY($2::text[])`,
              [DEFAULT_ORG_ID, dupIds, cluster.primary.id]
            );
          } else {
            await client.query(
              `UPDATE "CrmCandidate"
               SET "email" = $3, "phone" = $4, "profileUrl" = $5, "role" = $6,
                   "location" = $7, "experience" = $8, "source" = $9, "notes" = $10,
                   "updatedAt" = CURRENT_TIMESTAMP
               WHERE "id" = $1 AND "organizationId" = $2`,
              [
                cluster.primary.id,
                DEFAULT_ORG_ID,
                merged.email,
                merged.phone,
                merged.linkedin,
                merged.technology || "Staffing Candidate",
                merged.location || "Remote",
                merged.experience,
                merged.leadSource,
                merged.remark,
              ]
            );
          }
          mergedClusters++;
        }

        let deletedCount = 0;
        if (allIdsToDelete.length > 0) {
          const table = target === "leads" ? "CrmLead" : "CrmCandidate";
          const delRes = await client.query(
            `DELETE FROM "${table}" WHERE "organizationId" = $1 AND "id" = ANY($2::text[])`,
            [DEFAULT_ORG_ID, allIdsToDelete]
          );
          deletedCount = delRes.rowCount || allIdsToDelete.length;
        }

        if (mergedClusters > 0) {
          await recordImportLog(client, {
            actionType: "Deduplicate",
            targetType: target === "leads" ? "Leads" : "Candidates",
            sourceName: "Auto-Merge High Confidence",
            addedCount: 0,
            updatedCount: mergedClusters,
            skippedCount: deletedCount,
            actor,
            details: `Auto-merged ${mergedClusters} groups and removed ${deletedCount} extra duplicate rows`,
          });
        }

        return { mergedClusters, deletedCount };
      });

      return NextResponse.json({ success: true, ...summary });
    }

    return NextResponse.json({ success: false, error: "Unsupported duplicate action." }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/crm/leads/duplicates error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Duplicate action failed." }, { status: 500 });
  }
}
