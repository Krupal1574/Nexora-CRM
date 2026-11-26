"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useToast } from "@/lib/crm/toast-context";
import { useLeadStore } from "@/lib/crm/lead-store";
import { useCandidateStore } from "@/lib/crm/candidate-store";
import { useAuth } from "@/lib/crm/auth-context";
import {
  buildAutoColumnMapping,
  detectImportFormat,
  downloadWorkbookXlsx,
  extractSpreadsheetParts,
  normalizeMappedRows,
  parseSpreadsheetBuffer,
  TARGET_FIELD_OPTIONS,
  type ImportFormat,
  type NormalizedImportRow,
  type ParsedSpreadsheet,
  type TargetFieldKey,
} from "@/lib/crm/import-utils";
import {
  analyzeImportDuplicates,
  DEFAULT_DUPLICATE_OPTIONS,
  type DedupeComparableRecord,
  type DuplicateCluster,
  type DuplicateMatchOptions,
} from "@/lib/crm/duplicates";
import type { BulkImportSummary, DuplicateStrategy } from "@/lib/crm/bulk-import";

type ActiveTab = "import" | "gsheets" | "duplicates" | "export" | "history";
type TargetEntity = "leads" | "candidates";

interface SheetSourceRecord {
  id: string;
  name: string;
  sheetUrl: string;
  spreadsheetId: string;
  gid: string;
  sheetName: string;
  targetType: TargetEntity;
  duplicateMode: DuplicateStrategy;
  lastSyncedAt?: string | null;
  lastSyncCount?: number | null;
  lastSyncStatus?: string | null;
  lastSyncSummary?: string | null;
}

interface ImportLogRecord {
  id: string;
  actionType: string;
  targetType: string;
  sourceName: string;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  actor: string;
  details: string;
  createdAt: string;
}

interface GoogleSheetPreview {
  spreadsheetId: string;
  gid: string;
  sheetTitle: string;
  availableTabs: string[];
  detectedFormat: ImportFormat;
  headers: string[];
  dataRowCount: number;
  normalizedRows: NormalizedImportRow[];
  duplicateSummary: {
    total: number;
    newCount: number;
    dbDuplicateCount: number;
    fileDuplicateCount: number;
    previewItems: Array<{
      row: NormalizedImportRow;
      index: number;
      status: "new" | "db_duplicate" | "file_duplicate";
      matchedExistingName?: string;
      matchedFileRowIndex?: number;
      matchReasons: string[];
    }>;
  };
}

function escapeCsvCell(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function ImportExportPage() {
  const { show } = useToast();
  const { user } = useAuth();
  const { leads, bulkImportLeads, refreshLeads, dbConnected } = useLeadStore();
  const { candidates, bulkImportCandidates, refreshCandidates } = useCandidateStore();

  const actor = user?.name || "Support Admin";

  const [activeTab, setActiveTab] = useState<ActiveTab>("import");

  /* ── Tab 1: File Import (Excel / CSV) ── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [isBinaryExcel, setIsBinaryExcel] = useState(false);
  const [parsedSheet, setParsedSheet] = useState<ParsedSpreadsheet | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<ImportFormat>("generic");
  const [columnMap, setColumnMap] = useState<Record<number, TargetFieldKey>>({});
  const [targetType, setTargetType] = useState<TargetEntity>("leads");
  const [duplicateMode, setDuplicateMode] = useState<DuplicateStrategy>("skip");
  const [matchOptions, setMatchOptions] = useState<DuplicateMatchOptions>(DEFAULT_DUPLICATE_OPTIONS);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<BulkImportSummary | null>(null);

  /* ── Tab 2: Google Sheets Sync ── */
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetTabName, setSheetTabName] = useState("");
  const [sheetAlias, setSheetAlias] = useState("");
  const [sheetTarget, setSheetTarget] = useState<TargetEntity>("leads");
  const [sheetDupMode, setSheetDupMode] = useState<DuplicateStrategy>("skip");
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetPreview, setSheetPreview] = useState<GoogleSheetPreview | null>(null);
  const [savedSheets, setSavedSheets] = useState<SheetSourceRecord[]>([]);
  const [syncingSheetId, setSyncingSheetId] = useState<string | null>(null);

  /* ── Tab 3: Duplicate Finder & Merger ── */
  const [dupTarget, setDupTarget] = useState<TargetEntity>("leads");
  const [dupOptions, setDupOptions] = useState<DuplicateMatchOptions>(DEFAULT_DUPLICATE_OPTIONS);
  const [dupScanning, setDupScanning] = useState(false);
  const [dupTotalRecords, setDupTotalRecords] = useState(0);
  const [dupClusters, setDupClusters] = useState<DuplicateCluster[]>([]);
  const [dupActionBusy, setDupActionBusy] = useState<string | null>(null);

  /* ── Tab 5: History ── */
  const [historyLogs, setHistoryLogs] = useState<ImportLogRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadSavedSheets = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/google-sheets");
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedSheets(data.sources || []);
      }
    } catch (e) {
      console.error("Failed to fetch saved Google Sheets:", e);
    }
  }, []);

  const loadHistoryLogs = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/crm/import-logs");
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to load import logs:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const scanDuplicates = useCallback(
    async (target: TargetEntity = dupTarget, opts: DuplicateMatchOptions = dupOptions) => {
      setDupScanning(true);
      try {
        const params = new URLSearchParams({
          target,
          email: String(opts.matchByEmail),
          phone: String(opts.matchByPhone),
          linkedin: String(opts.matchByLinkedin),
          name: String(opts.matchByName),
          ignorePlaceholders: String(opts.ignorePlaceholders ?? true),
        });
        const res = await fetch(`/api/crm/leads/duplicates?${params.toString()}`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Scan failed");
        setDupTotalRecords(data.totalRecords || 0);
        setDupClusters(data.clusters || []);
      } catch (err: any) {
        show(err?.message || "Failed to scan duplicates");
      } finally {
        setDupScanning(false);
      }
    },
    [dupTarget, dupOptions, show]
  );

  useEffect(() => {
    if (activeTab === "gsheets") loadSavedSheets();
    if (activeTab === "history") loadHistoryLogs();
    if (activeTab === "duplicates" && dupClusters.length === 0 && !dupScanning) {
      scanDuplicates();
    }
  }, [activeTab, loadSavedSheets, loadHistoryLogs, scanDuplicates, dupClusters.length, dupScanning]);

  /* ── File Parsing Helpers ── */
  const applyParsedSheet = (parsed: ParsedSpreadsheet) => {
    const fmt = detectImportFormat(parsed.headers);
    const autoMap = buildAutoColumnMapping(parsed.headers, fmt);
    setParsedSheet(parsed);
    setDetectedFormat(fmt);
    setColumnMap(autoMap);
    setImportSummary(null);
  };

  const handleFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    const isExcel = /\.(xlsx|xls|xlsm|xlsb|ods)$/i.test(lower);
    const isCsv = /\.(csv|tsv|txt)$/i.test(lower);

    if (!isExcel && !isCsv) {
      show("Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }

    try {
      setFileName(file.name);
      setIsBinaryExcel(isExcel);

      if (isExcel) {
        const buf = await file.arrayBuffer();
        setFileBuffer(buf);
        const parsed = parseSpreadsheetBuffer(buf);
        applyParsedSheet(parsed);
        show(`Loaded ${parsed.dataRows.length} rows from "${parsed.activeSheet}" (${file.name})`);
      } else {
        setFileBuffer(null);
        const text = await file.text();
        const parsed = extractSpreadsheetParts(text);
        applyParsedSheet(parsed);
        show(`Loaded ${parsed.dataRows.length} rows from ${file.name}`);
      }
    } catch (err: any) {
      show(err?.message || "Could not parse spreadsheet file.");
    }
  };

  const handleSheetTabSwitch = (newSheet: string) => {
    if (!fileBuffer || !isBinaryExcel) return;
    try {
      const parsed = parseSpreadsheetBuffer(fileBuffer, newSheet);
      applyParsedSheet(parsed);
    } catch (err: any) {
      show(err?.message || `Could not read sheet "${newSheet}"`);
    }
  };

  const normalizedRows: NormalizedImportRow[] = useMemo(() => {
    if (!parsedSheet) return [];
    return normalizeMappedRows(parsedSheet.dataRows, columnMap, fileName || "Spreadsheet Import");
  }, [parsedSheet, columnMap, fileName]);

  const existingRecordsForDedupe: DedupeComparableRecord[] = useMemo(() => {
    if (targetType === "leads") {
      return leads.map((l) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        linkedin: l.linkedin,
      }));
    }
    return candidates.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      profileUrl: c.profileUrl,
    }));
  }, [targetType, leads, candidates]);

  const duplicateAnalysis = useMemo(() => {
    if (normalizedRows.length === 0) return null;
    return analyzeImportDuplicates(normalizedRows, existingRecordsForDedupe, matchOptions);
  }, [normalizedRows, existingRecordsForDedupe, matchOptions]);

  const handleExecuteImport = async () => {
    if (normalizedRows.length === 0) {
      show("No valid rows mapped (make sure Name / First Name is mapped).");
      return;
    }
    setImporting(true);
    try {
      const summary =
        targetType === "leads"
          ? await bulkImportLeads({
              rows: normalizedRows,
              duplicateMode,
              matchOptions,
              sourceName: fileName || "Spreadsheet Import",
              actor,
            })
          : await bulkImportCandidates({
              rows: normalizedRows,
              duplicateMode,
              matchOptions,
              sourceName: fileName || "Spreadsheet Import",
              actor,
            });
      setImportSummary(summary);
      show(
        `Import complete: +${summary.addedCount} added, ${summary.updatedCount} updated, ${summary.skippedCount} skipped`
      );
      loadHistoryLogs();
    } catch (err: any) {
      show(err?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  /* ── Google Sheets Handlers ── */
  const handlePreviewGoogleSheet = async (tabOverride?: string) => {
    if (!sheetUrl.trim()) {
      show("Please paste a Google Sheet URL.");
      return;
    }
    setSheetLoading(true);
    try {
      const res = await fetch("/api/crm/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          sheetUrl: sheetUrl.trim(),
          sheetName: tabOverride ?? sheetTabName.trim(),
          name: sheetAlias.trim(),
          targetType: sheetTarget,
          matchOptions,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Preview failed");
      setSheetPreview(data);
      if (tabOverride !== undefined) setSheetTabName(tabOverride);
      show(`Fetched ${data.dataRowCount} rows from "${data.sheetTitle}"`);
    } catch (err: any) {
      show(err?.message || "Failed to fetch Google Sheet.");
    } finally {
      setSheetLoading(false);
    }
  };

  const handleSyncGoogleSheet = async (opts?: { sourceId?: string }) => {
    if (!opts?.sourceId && !sheetUrl.trim()) {
      show("Please paste a Google Sheet URL.");
      return;
    }
    if (opts?.sourceId) setSyncingSheetId(opts.sourceId);
    else setSheetLoading(true);

    try {
      const res = await fetch("/api/crm/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          opts?.sourceId
            ? { action: "sync", sourceId: opts.sourceId, matchOptions, actor }
            : {
                action: "sync",
                sheetUrl: sheetUrl.trim(),
                sheetName: sheetTabName.trim(),
                name: sheetAlias.trim(),
                targetType: sheetTarget,
                duplicateMode: sheetDupMode,
                matchOptions,
                actor,
              }
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Sync failed");
      const s = data.summary as BulkImportSummary;
      show(
        `Synced: +${s.addedCount} added, ${s.updatedCount} updated, ${s.skippedCount} skipped`
      );
      await Promise.all([refreshLeads(), refreshCandidates(), loadSavedSheets(), loadHistoryLogs()]);
      if (!opts?.sourceId) {
        setSheetPreview(null);
      }
    } catch (err: any) {
      show(err?.message || "Google Sheet sync failed.");
    } finally {
      setSheetLoading(false);
      setSyncingSheetId(null);
    }
  };

  const handleSaveSheetConnection = async () => {
    if (!sheetUrl.trim()) {
      show("Please enter a Google Sheet URL first.");
      return;
    }
    setSheetLoading(true);
    try {
      const res = await fetch("/api/crm/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          sheetUrl: sheetUrl.trim(),
          sheetName: sheetTabName.trim(),
          name: sheetAlias.trim(),
          targetType: sheetTarget,
          duplicateMode: sheetDupMode,
          actor,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not save sheet");
      show("Saved Google Sheet connection.");
      loadSavedSheets();
    } catch (err: any) {
      show(err?.message || "Failed to save connection.");
    } finally {
      setSheetLoading(false);
    }
  };

  const handleDeleteSavedSheet = async (id: string) => {
    try {
      const res = await fetch(`/api/crm/google-sheets?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Delete failed");
      setSavedSheets((prev) => prev.filter((s) => s.id !== id));
      show("Removed Google Sheet connection.");
    } catch (err: any) {
      show(err?.message || "Failed to remove connection.");
    }
  };

  /* ── Duplicate Cluster Actions ── */
  const handleMergeCluster = async (cluster: DuplicateCluster) => {
    setDupActionBusy(cluster.clusterId);
    try {
      const res = await fetch("/api/crm/leads/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merge",
          target: dupTarget,
          primaryId: cluster.primary.id,
          duplicateIds: cluster.duplicates.map((d) => d.id),
          actor,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Merge failed");
      show(`Merged ${cluster.duplicates.length} duplicate(s) into "${cluster.primary.name}"`);
      setDupClusters((prev) => prev.filter((c) => c.clusterId !== cluster.clusterId));
      await (dupTarget === "leads" ? refreshLeads() : refreshCandidates());
    } catch (err: any) {
      show(err?.message || "Merge failed.");
    } finally {
      setDupActionBusy(null);
    }
  };

  const handleDeleteClusterDuplicates = async (cluster: DuplicateCluster) => {
    setDupActionBusy(cluster.clusterId);
    try {
      const res = await fetch("/api/crm/leads/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          target: dupTarget,
          duplicateIds: cluster.duplicates.map((d) => d.id),
          actor,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Delete failed");
      show(`Deleted ${data.deletedCount} duplicate record(s)`);
      setDupClusters((prev) => prev.filter((c) => c.clusterId !== cluster.clusterId));
      await (dupTarget === "leads" ? refreshLeads() : refreshCandidates());
    } catch (err: any) {
      show(err?.message || "Delete failed.");
    } finally {
      setDupActionBusy(null);
    }
  };

  const handleAutoMergeHighConfidence = async () => {
    setDupActionBusy("auto_merge");
    try {
      const res = await fetch("/api/crm/leads/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto_merge",
          target: dupTarget,
          matchOptions: { ...dupOptions, matchByName: false },
          actor,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Auto-merge failed");
      show(
        `Auto-merged ${data.mergedClusters} groups (${data.deletedCount} duplicates removed)`
      );
      await Promise.all([
        scanDuplicates(dupTarget, dupOptions),
        dupTarget === "leads" ? refreshLeads() : refreshCandidates(),
      ]);
    } catch (err: any) {
      show(err?.message || "Auto-merge failed.");
    } finally {
      setDupActionBusy(null);
    }
  };

  /* ── Export Handlers ── */
  const handleExport = async (entity: TargetEntity, format: "xlsx" | "csv") => {
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `nexora-${entity}-${dateStr}.${format}`;

    const rows: Record<string, string | number>[] =
      entity === "leads"
        ? leads.map((l) => ({
            Name: l.name || "",
            Date: l.date || "",
            Location: l.location || "",
            Phone: l.phone || "",
            Email: l.email || "",
            LinkedIn: l.linkedin || "",
            "Visa Status": l.visaStatus || "",
            Experience: l.experience || "",
            "Lead Type": l.leadType || "",
            "Lead Source": l.leadSource || "",
            "Lead Person": l.leadPerson || "",
            "Sales Person": l.salesPerson || "",
            Technology: l.technology || "",
            "Account Ref": l.accountRef || "",
            Stage: l.stage || "",
            Remark: l.remark || "",
          }))
        : candidates.map((c) => ({
            Name: c.name || "",
            Role: c.role || "",
            Email: c.email || "",
            Phone: c.phone || "",
            Location: c.location || "",
            Experience: c.experience || "",
            Stage: c.stage || "",
            Source: c.source || "",
            LinkedIn: c.profileUrl || "",
            Skills: c.skills.join("; "),
          }));

    if (rows.length === 0) {
      show(`No ${entity} available to export.`);
      return;
    }

    if (format === "xlsx") {
      downloadWorkbookXlsx(filename, entity === "leads" ? "Leads" : "Candidates", rows);
    } else {
      const headers = Object.keys(rows[0]);
      const csvLines = [
        headers.map(escapeCsvCell).join(","),
        ...rows.map((r) => headers.map((h) => escapeCsvCell((r as Record<string, unknown>)[h])).join(",")),
      ];
      const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    show(`Exported ${rows.length} ${entity} to ${filename}`);

    fetch("/api/crm/import-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionType: "Export",
        targetType: entity === "leads" ? "Leads" : "Candidates",
        sourceName: filename,
        addedCount: rows.length,
        actor,
        details: `Exported ${rows.length} ${entity} as ${format.toUpperCase()}`,
      }),
    }).catch(() => {});
  };

  const totalExtraDuplicates = dupClusters.reduce((sum, c) => sum + c.duplicates.length, 0);

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Data Hub — Import, Deduplicate &amp; Sync</h1>
          <p className="page-sub">
            Import Excel (.xlsx/.xls) or CSV spreadsheets, connect Google Sheets directly, and clean duplicate records in PostgreSQL.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`pill ${dbConnected ? "ok" : "bad"}`}>
            {dbConnected ? "PostgreSQL Connected" : "Local Fallback"}
          </span>
          <Link href="/leads" className="btn ghost">
            View Leads ({leads.length})
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tools" style={{ marginBottom: 18 }}>
        {[
          { id: "import", label: "Excel / CSV Import" },
          { id: "gsheets", label: "Google Sheets Sync" },
          { id: "duplicates", label: `Find Duplicates${dupClusters.length ? ` (${dupClusters.length})` : ""}` },
          { id: "export", label: "Export (.xlsx / .csv)" },
          { id: "history", label: "Sync & Import History" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? "" : "ghost"}`}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: EXCEL / CSV IMPORT WITH COLUMN MAPPING & DUPLICATE PREVIEW
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "import" && (
        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div>
                <b style={{ fontSize: 16 }}>1. Upload Excel or CSV File</b>
                <p style={{ margin: "4px 0 0", color: "var(--mu)", fontSize: 13 }}>
                  Supports .xlsx, .xls, .xlsm, .ods, and .csv (Bitrix24, Nexora, or custom headers).
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label style={{ fontSize: 12, color: "var(--mu)" }}>Import into:</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as TargetEntity)}
                  style={{ width: "auto" }}
                >
                  <option value="leads">Leads Pipeline</option>
                  <option value="candidates">Candidates Pool</option>
                </select>
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? "var(--or)" : "var(--bd)"}`,
                borderRadius: "var(--radius)",
                padding: "32px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: dragActive ? "rgba(242, 106, 33, 0.06)" : "var(--bg)",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv,.txt"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                {fileName ? `Selected: ${fileName}` : "Drop Excel (.xlsx / .xls) or CSV file here, or click to browse"}
              </div>
              <div style={{ color: "var(--mu)", fontSize: 13 }}>
                {parsedSheet
                  ? `${parsedSheet.dataRows.length} data rows • ${parsedSheet.headers.length} columns • Format: ${detectedFormat.toUpperCase()}`
                  : "Auto-detects columns, normalizes phone/dates/stages, and checks duplicates before saving"}
              </div>
            </div>

            {parsedSheet && parsedSheet.sheetNames.length > 1 && (
              <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Workbook Sheet:</span>
                {parsedSheet.sheetNames.map((sn) => (
                  <button
                    key={sn}
                    className={`btn ${parsedSheet.activeSheet === sn ? "" : "ghost"}`}
                    style={{ padding: "5px 10px", fontSize: 12 }}
                    onClick={() => handleSheetTabSwitch(sn)}
                  >
                    {sn}
                  </button>
                ))}
              </div>
            )}
          </div>

          {parsedSheet && (
            <>
              {/* Step 2: Column Mapping */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <div>
                    <b style={{ fontSize: 16 }}>2. Verify Column Mapping</b>
                    <span className="pill" style={{ marginLeft: 10 }}>
                      Detected: {detectedFormat}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--mu)" }}>
                    {normalizedRows.length} valid rows with a candidate/lead name
                  </span>
                </div>

                <div className="grid g3" style={{ gap: 10 }}>
                  {parsedSheet.headers.map((header, idx) => (
                    <div
                      key={`${header}-${idx}`}
                      style={{
                        border: "1px solid var(--bd)",
                        borderRadius: "var(--radius-sm)",
                        padding: "8px 10px",
                        background: "var(--bg)",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "var(--mu)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Spreadsheet: <strong style={{ color: "var(--tx)" }}>{header}</strong>
                      </div>
                      <select
                        value={columnMap[idx] || "ignore"}
                        onChange={(e) =>
                          setColumnMap((prev) => ({
                            ...prev,
                            [idx]: e.target.value as TargetFieldKey,
                          }))
                        }
                        style={{ padding: "6px 8px", fontSize: 13 }}
                      >
                        {TARGET_FIELD_OPTIONS.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Duplicate Check & Strategy */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                  <div>
                    <b style={{ fontSize: 16 }}>3. Duplicate Detection &amp; Import Options</b>
                    <p style={{ margin: "4px 0 0", color: "var(--mu)", fontSize: 13 }}>
                      Checks incoming rows against {existingRecordsForDedupe.length} existing {targetType} and earlier rows in this file.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        style={{ width: "auto" }}
                        checked={matchOptions.matchByEmail}
                        onChange={(e) => setMatchOptions((o) => ({ ...o, matchByEmail: e.target.checked }))}
                      />
                      Email
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        style={{ width: "auto" }}
                        checked={matchOptions.matchByPhone}
                        onChange={(e) => setMatchOptions((o) => ({ ...o, matchByPhone: e.target.checked }))}
                      />
                      Phone
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        style={{ width: "auto" }}
                        checked={matchOptions.matchByLinkedin}
                        onChange={(e) => setMatchOptions((o) => ({ ...o, matchByLinkedin: e.target.checked }))}
                      />
                      LinkedIn
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        style={{ width: "auto" }}
                        checked={matchOptions.matchByName}
                        onChange={(e) => setMatchOptions((o) => ({ ...o, matchByName: e.target.checked }))}
                      />
                      Exact Name
                    </label>
                  </div>
                </div>

                {duplicateAnalysis && (
                  <div className="grid g4" style={{ marginBottom: 16 }}>
                    <div className="card kpi">
                      <span>Ready to Import</span>
                      <b>{normalizedRows.length}</b>
                    </div>
                    <div className="card kpi">
                      <span>Brand New Records</span>
                      <b style={{ color: "var(--ok)" }}>{duplicateAnalysis.newCount}</b>
                    </div>
                    <div className="card kpi">
                      <span>Already in Database</span>
                      <b style={{ color: "var(--or)" }}>{duplicateAnalysis.dbDuplicateCount}</b>
                    </div>
                    <div className="card kpi">
                      <span>Duplicates in File</span>
                      <b style={{ color: "var(--bad)" }}>{duplicateAnalysis.fileDuplicateCount}</b>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>When duplicate is found:</span>
                    <select
                      value={duplicateMode}
                      onChange={(e) => setDuplicateMode(e.target.value as DuplicateStrategy)}
                      style={{ width: "auto" }}
                    >
                      <option value="skip">Skip duplicates (recommended)</option>
                      <option value="update">Update existing record with new fields</option>
                      <option value="allow">Import everything (allow duplicates)</option>
                    </select>
                  </div>

                  <button
                    className="btn"
                    disabled={importing || normalizedRows.length === 0}
                    onClick={handleExecuteImport}
                  >
                    {importing ? "Importing into PostgreSQL…" : `Import ${normalizedRows.length} ${targetType === "leads" ? "Leads" : "Candidates"}`}
                  </button>
                </div>

                {importSummary && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: "rgba(31, 157, 107, 0.12)",
                      border: "1px solid var(--ok)",
                      marginBottom: 14,
                      fontSize: 13,
                    }}
                  >
                    <strong>Import Complete:</strong> {importSummary.addedCount} added, {importSummary.updatedCount} updated,{" "}
                    {importSummary.skippedCount} skipped.
                  </div>
                )}

                {duplicateAnalysis && duplicateAnalysis.items.length > 0 && (
                  <div className="tbl">
                    <table>
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Status</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Technology / Role</th>
                          <th>Stage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {duplicateAnalysis.items.slice(0, 25).map((item) => (
                          <tr key={`${item.index}-${item.row.name}`}>
                            <td style={{ color: "var(--mu)" }}>#{item.row.rowIndex}</td>
                            <td>
                              {item.status === "new" && <span className="pill ok">New</span>}
                              {item.status === "db_duplicate" && (
                                <span className="pill or" title={`Matches DB: ${item.matchedExistingName}`}>
                                  DB Dup ({item.matchReasons.join(", ")})
                                </span>
                              )}
                              {item.status === "file_duplicate" && (
                                <span className="pill bad" title={`Matches Row #${item.matchedFileRowIndex}`}>
                                  File Dup ({item.matchReasons.join(", ")})
                                </span>
                              )}
                            </td>
                            <td><strong>{item.row.name}</strong></td>
                            <td>{item.row.email || "—"}</td>
                            <td>{item.row.phone || "—"}</td>
                            <td>{item.row.technology || "—"}</td>
                            <td><span className="pill">{item.row.stage}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {duplicateAnalysis.items.length > 25 && (
                      <div style={{ fontSize: 12, color: "var(--mu)", paddingTop: 8 }}>
                        Showing first 25 of {duplicateAnalysis.items.length} parsed rows.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: GOOGLE SHEETS DIRECT SYNC
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "gsheets" && (
        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <b style={{ fontSize: 16 }}>Connect a Google Sheet</b>
            <p style={{ margin: "4px 0 14px", color: "var(--mu)", fontSize: 13 }}>
              Paste any Google Sheet link shared with <em>&ldquo;Anyone with the link can view&rdquo;</em> (or published to the web). Nexora fetches live rows directly into PostgreSQL.
            </p>

            <div className="grid g2" style={{ gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--mu)", display: "block", marginBottom: 4 }}>Google Sheet URL *</label>
                <input
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--mu)", display: "block", marginBottom: 4 }}>Connection Name (optional)</label>
                <input
                  placeholder="e.g. Daily Recruiting Leads Sheet"
                  value={sheetAlias}
                  onChange={(e) => setSheetAlias(e.target.value)}
                />
              </div>
            </div>

            <div className="grid g3" style={{ gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--mu)", display: "block", marginBottom: 4 }}>Tab / Sheet Name (optional)</label>
                <input
                  placeholder="Leave blank for URL gid or first tab"
                  value={sheetTabName}
                  onChange={(e) => setSheetTabName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--mu)", display: "block", marginBottom: 4 }}>Target Table</label>
                <select value={sheetTarget} onChange={(e) => setSheetTarget(e.target.value as TargetEntity)}>
                  <option value="leads">Leads Pipeline</option>
                  <option value="candidates">Candidates Pool</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--mu)", display: "block", marginBottom: 4 }}>Duplicate Handling</label>
                <select value={sheetDupMode} onChange={(e) => setSheetDupMode(e.target.value as DuplicateStrategy)}>
                  <option value="skip">Skip existing duplicates</option>
                  <option value="update">Update existing records</option>
                  <option value="allow">Allow all rows</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn ghost" disabled={sheetLoading} onClick={() => handlePreviewGoogleSheet()}>
                {sheetLoading ? "Fetching…" : "Preview Sheet"}
              </button>
              <button className="btn" disabled={sheetLoading} onClick={() => handleSyncGoogleSheet()}>
                {sheetLoading ? "Syncing…" : "Sync Now to Database"}
              </button>
              <button className="btn navy" disabled={sheetLoading} onClick={handleSaveSheetConnection}>
                Save Connection
              </button>
            </div>
          </div>

          {sheetPreview && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <div>
                  <b style={{ fontSize: 15 }}>Preview: {sheetPreview.sheetTitle}</b>
                  <span className="pill" style={{ marginLeft: 8 }}>Format: {sheetPreview.detectedFormat}</span>
                </div>
                {sheetPreview.availableTabs.length > 1 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--mu)" }}>Tabs:</span>
                    {sheetPreview.availableTabs.map((tab) => (
                      <button
                        key={tab}
                        className={`btn ${sheetTabName === tab ? "" : "ghost"}`}
                        style={{ padding: "4px 9px", fontSize: 12 }}
                        onClick={() => handlePreviewGoogleSheet(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid g4" style={{ marginBottom: 14 }}>
                <div className="card kpi"><span>Fetched Rows</span><b>{sheetPreview.duplicateSummary.total}</b></div>
                <div className="card kpi"><span>New Records</span><b style={{ color: "var(--ok)" }}>{sheetPreview.duplicateSummary.newCount}</b></div>
                <div className="card kpi"><span>Already in DB</span><b style={{ color: "var(--or)" }}>{sheetPreview.duplicateSummary.dbDuplicateCount}</b></div>
                <div className="card kpi"><span>In-Sheet Dups</span><b style={{ color: "var(--bad)" }}>{sheetPreview.duplicateSummary.fileDuplicateCount}</b></div>
              </div>

              <div className="tbl">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Status</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Technology</th>
                      <th>Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetPreview.duplicateSummary.previewItems.slice(0, 20).map((item) => (
                      <tr key={`${item.index}-${item.row.name}`}>
                        <td style={{ color: "var(--mu)" }}>#{item.row.rowIndex}</td>
                        <td>
                          {item.status === "new" && <span className="pill ok">New</span>}
                          {item.status === "db_duplicate" && <span className="pill or">DB Dup ({item.matchReasons.join(", ")})</span>}
                          {item.status === "file_duplicate" && <span className="pill bad">Sheet Dup</span>}
                        </td>
                        <td><strong>{item.row.name}</strong></td>
                        <td>{item.row.email || "—"}</td>
                        <td>{item.row.phone || "—"}</td>
                        <td>{item.row.technology || "—"}</td>
                        <td><span className="pill">{item.row.stage}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Saved Google Sheets */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <b style={{ fontSize: 15 }}>Saved Google Sheet Connections ({savedSheets.length})</b>
              <button className="btn ghost" onClick={loadSavedSheets} style={{ padding: "5px 10px", fontSize: 12 }}>
                Refresh
              </button>
            </div>

            {savedSheets.length === 0 ? (
              <p style={{ color: "var(--mu)", fontSize: 13, margin: 0 }}>
                No saved Google Sheets yet. Paste a link above and click Sync Now or Save Connection.
              </p>
            ) : (
              <div className="tbl">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Target</th>
                      <th>Last Sync</th>
                      <th>Summary</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedSheets.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.name}</strong>
                          <div style={{ fontSize: 11, color: "var(--mu)" }}>
                            {s.sheetName ? `Tab: ${s.sheetName}` : `gid=${s.gid || "0"}`}
                          </div>
                        </td>
                        <td><span className="pill">{s.targetType}</span></td>
                        <td style={{ fontSize: 12, color: "var(--mu)" }}>
                          {s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleString() : "Never"}
                        </td>
                        <td style={{ fontSize: 12 }}>{s.lastSyncSummary || "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="btn"
                              style={{ padding: "5px 10px", fontSize: 12 }}
                              disabled={syncingSheetId === s.id}
                              onClick={() => handleSyncGoogleSheet({ sourceId: s.id })}
                            >
                              {syncingSheetId === s.id ? "Syncing…" : "Sync Now"}
                            </button>
                            <button
                              className="btn ghost"
                              style={{ padding: "5px 10px", fontSize: 12 }}
                              onClick={() => handleDeleteSavedSheet(s.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: FIND & MERGE DUPLICATES IN DATABASE
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "duplicates" && (
        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div>
                <b style={{ fontSize: 16 }}>Database Duplicate Scanner &amp; Merger</b>
                <p style={{ margin: "4px 0 0", color: "var(--mu)", fontSize: 13 }}>
                  Finds duplicate records across normalized email, phone, LinkedIn, and optional full name. Merging keeps the richest record and migrates notes.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  value={dupTarget}
                  onChange={(e) => {
                    const next = e.target.value as TargetEntity;
                    setDupTarget(next);
                    scanDuplicates(next, dupOptions);
                  }}
                  style={{ width: "auto" }}
                >
                  <option value="leads">Scan Leads</option>
                  <option value="candidates">Scan Candidates</option>
                </select>
                <button className="btn ghost" disabled={dupScanning} onClick={() => scanDuplicates()}>
                  {dupScanning ? "Scanning…" : "Re-scan"}
                </button>
                <button
                  className="btn"
                  disabled={dupActionBusy !== null || dupClusters.filter((c) => c.confidence === "high").length === 0}
                  onClick={handleAutoMergeHighConfidence}
                >
                  {dupActionBusy === "auto_merge" ? "Merging…" : "Auto-Merge High Confidence"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, marginBottom: 14 }}>
              <span style={{ color: "var(--mu)", fontWeight: 600 }}>Match by:</span>
              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ width: "auto" }}
                  checked={dupOptions.matchByEmail}
                  onChange={(e) => setDupOptions((o) => ({ ...o, matchByEmail: e.target.checked }))}
                />
                Email
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ width: "auto" }}
                  checked={dupOptions.matchByPhone}
                  onChange={(e) => setDupOptions((o) => ({ ...o, matchByPhone: e.target.checked }))}
                />
                Phone
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ width: "auto" }}
                  checked={dupOptions.matchByLinkedin}
                  onChange={(e) => setDupOptions((o) => ({ ...o, matchByLinkedin: e.target.checked }))}
                />
                LinkedIn URL
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ width: "auto" }}
                  checked={dupOptions.matchByName}
                  onChange={(e) => setDupOptions((o) => ({ ...o, matchByName: e.target.checked }))}
                />
                Exact Full Name
              </label>
            </div>

            <div className="grid g3">
              <div className="card kpi"><span>Records Scanned</span><b>{dupTotalRecords}</b></div>
              <div className="card kpi"><span>Duplicate Groups</span><b style={{ color: "var(--or)" }}>{dupClusters.length}</b></div>
              <div className="card kpi"><span>Extra Duplicate Rows</span><b style={{ color: "var(--bad)" }}>{totalExtraDuplicates}</b></div>
            </div>
          </div>

          {dupClusters.length === 0 && !dupScanning ? (
            <div className="card">
              <p style={{ margin: 0, color: "var(--mu)" }}>
                No duplicate clusters found with the current matching criteria.
              </p>
            </div>
          ) : (
            dupClusters.slice(0, 40).map((cluster) => (
              <div key={cluster.clusterId} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 15 }}>{cluster.primary.name}</strong>
                    <span className={`pill ${cluster.confidence === "high" ? "or" : ""}`}>
                      {cluster.confidence.toUpperCase()} ({cluster.records.length} records)
                    </span>
                    <span style={{ fontSize: 12, color: "var(--mu)" }}>{cluster.matchKeySummary}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      disabled={dupActionBusy !== null}
                      onClick={() => handleMergeCluster(cluster)}
                    >
                      {dupActionBusy === cluster.clusterId ? "Working…" : "Merge into Primary"}
                    </button>
                    <button
                      className="btn ghost"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      disabled={dupActionBusy !== null}
                      onClick={() => handleDeleteClusterDuplicates(cluster)}
                    >
                      Delete Duplicates
                    </button>
                  </div>
                </div>

                <div className="tbl">
                  <table>
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Technology</th>
                        <th>Stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cluster.records.map((rec, idx) => (
                        <tr key={rec.id}>
                          <td>
                            {idx === 0 ? (
                              <span className="pill ok">Primary (Keep)</span>
                            ) : (
                              <span className="pill bad">Duplicate</span>
                            )}
                          </td>
                          <td><strong>{rec.name}</strong></td>
                          <td>{rec.email || "—"}</td>
                          <td>{rec.phone || "—"}</td>
                          <td>{rec.technology || rec.role || "—"}</td>
                          <td><span className="pill">{rec.stage || "New Lead"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
          {dupClusters.length > 40 && (
            <p style={{ color: "var(--mu)", fontSize: 13 }}>
              Showing first 40 of {dupClusters.length} duplicate groups. Use Auto-Merge High Confidence to clean all verified email/phone/LinkedIn duplicates at once.
            </p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 4: EXPORT (.XLSX & .CSV)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "export" && (
        <div className="grid g2">
          <div className="card">
            <b style={{ fontSize: 16 }}>Export Leads ({leads.length})</b>
            <p style={{ color: "var(--mu)", fontSize: 13, margin: "6px 0 14px" }}>
              Download the complete Leads database including LinkedIn URLs, visa status, stages, and remarks.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" onClick={() => handleExport("leads", "xlsx")}>
                Download Excel (.xlsx)
              </button>
              <button className="btn ghost" onClick={() => handleExport("leads", "csv")}>
                Download CSV (.csv)
              </button>
            </div>
          </div>

          <div className="card">
            <b style={{ fontSize: 16 }}>Export Candidates ({candidates.length})</b>
            <p style={{ color: "var(--mu)", fontSize: 13, margin: "6px 0 14px" }}>
              Download all candidates with skills, experience, location, stage, and contact details.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" onClick={() => handleExport("candidates", "xlsx")}>
                Download Excel (.xlsx)
              </button>
              <button className="btn ghost" onClick={() => handleExport("candidates", "csv")}>
                Download CSV (.csv)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 5: SYNC & IMPORT HISTORY
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <b style={{ fontSize: 16 }}>Import, Sync &amp; Deduplication History</b>
            <button className="btn ghost" onClick={loadHistoryLogs} disabled={historyLoading}>
              {historyLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
          {historyLogs.length === 0 ? (
            <p style={{ color: "var(--mu)", fontSize: 13, margin: 0 }}>No import or sync events recorded yet.</p>
          ) : (
            <div className="tbl">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Source</th>
                    <th>Results</th>
                    <th>Actor</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 12, color: "var(--mu)", whiteSpace: "nowrap" }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td><span className="pill">{log.actionType}</span></td>
                      <td>{log.targetType}</td>
                      <td><strong>{log.sourceName}</strong></td>
                      <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                        <span style={{ color: "var(--ok)", fontWeight: 600 }}>+{log.addedCount}</span>{" / "}
                        <span style={{ color: "var(--or)", fontWeight: 600 }}>~{log.updatedCount}</span>{" / "}
                        <span style={{ color: "var(--mu)" }}>{log.skippedCount} skipped</span>
                      </td>
                      <td>{log.actor}</td>
                      <td style={{ fontSize: 12, color: "var(--mu)" }}>{log.details || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </CrmShell>
  );
}
