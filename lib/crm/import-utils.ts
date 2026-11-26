import * as XLSX from "xlsx";

export type ImportFormat = "nexora" | "bitrix24" | "generic";

export const VALID_LEAD_STAGES = [
  "New Lead",
  "Resume Lead",
  "Chat Lead",
  "Outsource",
  "Website",
  "Cold E-mail",
  "DNR 1",
  "DNR 2",
  "DNR 3",
  "New Stage",
  "Hot Lead DNR",
  "Not Interested",
  "Connected",
  "Follow Up",
  "Qualified",
  "Enrolled",
] as const;

export type ValidLeadStage = (typeof VALID_LEAD_STAGES)[number];

export type TargetFieldKey =
  | "ignore"
  | "name"
  | "firstName"
  | "lastName"
  | "date"
  | "location"
  | "phone"
  | "email"
  | "linkedin"
  | "visaStatus"
  | "experience"
  | "leadType"
  | "leadSource"
  | "leadPerson"
  | "salesPerson"
  | "technology"
  | "accountRef"
  | "remark"
  | "stage";

export const TARGET_FIELD_OPTIONS: { key: TargetFieldKey; label: string }[] = [
  { key: "ignore", label: "— Ignore column —" },
  { key: "name", label: "Candidate / Lead Name" },
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email Address" },
  { key: "phone", label: "Phone / Mobile" },
  { key: "linkedin", label: "LinkedIn / Profile URL" },
  { key: "technology", label: "Technology / Role / Skills" },
  { key: "visaStatus", label: "Visa Status" },
  { key: "experience", label: "Experience" },
  { key: "location", label: "Location / City" },
  { key: "stage", label: "Pipeline Stage" },
  { key: "leadType", label: "Lead Type (Hot / Warm / Cold)" },
  { key: "leadSource", label: "Lead Source" },
  { key: "leadPerson", label: "Lead Person (Sourcer)" },
  { key: "salesPerson", label: "Sales Person (Owner)" },
  { key: "accountRef", label: "Account Ref / Client" },
  { key: "date", label: "Date / Created" },
  { key: "remark", label: "Remark / Notes / Comment" },
];

export interface NormalizedImportRow {
  rowIndex: number;
  name: string;
  date: string;
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  visaStatus: string;
  experience: string;
  leadType: string;
  leadSource: string;
  leadPerson: string;
  salesPerson: string;
  technology: string;
  accountRef: string;
  remark: string;
  stage: ValidLeadStage;
  company: string;
}

export interface ParsedSpreadsheet {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  dataRows: string[][];
}

/** Map from lowercase Bitrix24 header → Nexora internal key */
const BITRIX_TO_NEXORA: Record<string, TargetFieldKey | "phone_alt" | "email_alt" | "leadPerson_alt" | "city" | "country"> = {
  "lead name": "name",
  "first name": "firstName",
  "last name": "lastName",
  stage: "stage",
  mobile: "phone",
  "work phone": "phone_alt",
  "work e-mail": "email",
  "home e-mail": "email_alt",
  linkedin: "linkedin",
  visa: "visaStatus",
  "job role": "technology",
  "total experience": "experience",
  source: "leadSource",
  responsible: "salesPerson",
  "lead generator": "leadPerson",
  "lead create by": "leadPerson_alt",
  created: "date",
  "company name": "accountRef",
  position: "technology",
  comment: "remark",
  city: "city",
  country: "country",
};

/** Flexible Nexora & generic spreadsheet headers (lowercase) → target field */
const FLEXIBLE_HEADERS: Record<string, TargetFieldKey> = {
  date: "date",
  "created at": "date",
  "added date": "date",
  created: "date",
  timestamp: "date",

  location: "location",
  city: "location",
  state: "location",
  country: "location",

  name: "name",
  "full name": "name",
  "candidate name": "name",
  "lead name": "name",
  candidate: "name",
  "applicant name": "name",
  "first name": "firstName",
  "last name": "lastName",

  number: "phone",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  "mobile number": "phone",
  contact: "phone",
  "contact number": "phone",
  cell: "phone",
  "work phone": "phone",

  "e-mail": "email",
  email: "email",
  "email id": "email",
  "email address": "email",
  "work e-mail": "email",
  "work email": "email",
  "home e-mail": "email",
  mail: "email",

  "linkedin/ facebook": "linkedin",
  linkedin: "linkedin",
  "linkedin url": "linkedin",
  "linkedin profile": "linkedin",
  "profile url": "linkedin",
  profile: "linkedin",
  facebook: "linkedin",

  "visa status": "visaStatus",
  visa: "visaStatus",
  "work authorization": "visaStatus",
  authorization: "visaStatus",

  experience: "experience",
  "total experience": "experience",
  exp: "experience",
  "years of experience": "experience",
  yrs: "experience",

  "lead type": "leadType",
  temperature: "leadType",
  priority: "leadType",
  type: "leadType",

  "lead source": "leadSource",
  source: "leadSource",
  channel: "leadSource",

  "lead person": "leadPerson",
  sourcer: "leadPerson",
  "sourced by": "leadPerson",
  "lead generator": "leadPerson",
  "lead create by": "leadPerson",
  recruiter: "leadPerson",

  "sales person": "salesPerson",
  "sales owner": "salesPerson",
  responsible: "salesPerson",
  owner: "salesPerson",
  "assigned to": "salesPerson",

  technology: "technology",
  tech: "technology",
  "tech stack": "technology",
  role: "technology",
  "job role": "technology",
  position: "technology",
  skill: "technology",
  skills: "technology",
  domain: "technology",

  "account ref": "accountRef",
  "account reference": "accountRef",
  company: "accountRef",
  "company name": "accountRef",
  client: "accountRef",
  mandate: "accountRef",

  remark: "remark",
  remarks: "remark",
  note: "remark",
  notes: "remark",
  comment: "remark",
  comments: "remark",

  stage: "stage",
  "lead stage": "stage",
  "pipeline stage": "stage",
  status: "stage",
};

export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  if (tabs > commas && tabs > semicolons) return "\t";
  return semicolons > commas ? ";" : ",";
}

/**
 * RFC 4180 CSV/TSV parser handling BOM, quoted multi-line fields, escaped quotes,
 * and automatic comma / semicolon / tab delimiter detection.
 */
export function parseCSV(rawText: string, delimiter?: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, "");
  const delim = delimiter || detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === delim) {
        row.push(field.trim());
        field = "";
        i++;
      } else if (ch === "\r") {
        i++;
      } else if (ch === "\n") {
        row.push(field.trim());
        field = "";
        if (row.some((c) => c.length > 0)) {
          rows.push(row);
        }
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  row.push(field.trim());
  if (row.some((c) => c.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    // Adjust slightly for Excel timezone rounding near midnight
    const adjusted = new Date(val.getTime() + 12 * 3600 * 1000);
    return adjusted.toISOString().slice(0, 10);
  }
  return String(val).trim();
}

/**
 * Finds the true header row index inside a spreadsheet grid (skips blank rows
 * or 1-cell report banner rows).
 */
function findHeaderRowIndex(rows: string[][]): number {
  const limit = Math.min(rows.length, 10);
  for (let i = 0; i < limit; i++) {
    const nonEmpty = rows[i].filter((c) => c.trim().length > 0);
    if (nonEmpty.length >= 2) {
      return i;
    }
  }
  return 0;
}

/**
 * Parses an Excel (.xlsx, .xls, .xlsm, .ods) or CSV buffer into sheet names,
 * normalized headers, and string rows.
 */
export function parseSpreadsheetBuffer(
  buffer: ArrayBuffer,
  preferredSheet?: string
): ParsedSpreadsheet {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error("Workbook does not contain any worksheets.");
  }

  const activeSheet =
    preferredSheet && sheetNames.includes(preferredSheet)
      ? preferredSheet
      : sheetNames.find((name) => {
          const ws = workbook.Sheets[name];
          const preview = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
          return preview.some((r) => Array.isArray(r) && r.some((c) => c !== null && c !== undefined && String(c).trim() !== ""));
        }) || sheetNames[0];

  const worksheet = workbook.Sheets[activeSheet];
  const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  const stringRows: string[][] = rawMatrix
    .map((r) => (Array.isArray(r) ? r.map(formatCellValue) : []))
    .filter((r) => r.some((c) => c.length > 0));

  if (stringRows.length < 2) {
    throw new Error(`Sheet "${activeSheet}" must include a header row and at least one data row.`);
  }

  const headerIdx = findHeaderRowIndex(stringRows);
  const rawHeaders = stringRows[headerIdx];
  // Pad or trim each row to match header length
  const headers = rawHeaders.map((h, idx) => h || `Column ${idx + 1}`);
  const dataRows = stringRows.slice(headerIdx + 1).map((r) =>
    headers.map((_, idx) => (r[idx] ?? "").trim())
  );

  return { sheetNames, activeSheet, headers, dataRows };
}

export function extractSpreadsheetParts(text: string): ParsedSpreadsheet {
  const rows = parseCSV(text);
  if (rows.length < 2) {
    throw new Error("Sheet must include a header row and at least one data row.");
  }
  const headerIdx = findHeaderRowIndex(rows);
  const headers = rows[headerIdx].map((h, idx) => h || `Column ${idx + 1}`);
  const dataRows = rows.slice(headerIdx + 1).map((r) =>
    headers.map((_, idx) => (r[idx] ?? "").trim())
  );
  return {
    sheetNames: ["Sheet1"],
    activeSheet: "Sheet1",
    headers,
    dataRows,
  };
}

export function detectImportFormat(headers: string[]): ImportFormat {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  const bitrixSignals = ["lead name", "responsible", "work e-mail", "lead generator", "work phone"].filter((s) =>
    lowerHeaders.includes(s)
  );
  if (bitrixSignals.length >= 2) return "bitrix24";

  const nexoraSignals = ["name", "full name", "technology", "visa status", "lead person", "sales person", "e-mail", "number"].filter(
    (s) => lowerHeaders.includes(s)
  );
  if (nexoraSignals.length >= 2) return "nexora";

  return "generic";
}

export function buildAutoColumnMapping(headers: string[], format: ImportFormat): Record<number, TargetFieldKey> {
  const map: Record<number, TargetFieldKey> = {};
  headers.forEach((h, idx) => {
    const clean = h.toLowerCase().replace(/\s+/g, " ").trim();
    if (format === "bitrix24") {
      const bitrixTarget = BITRIX_TO_NEXORA[clean];
      if (bitrixTarget === "phone_alt") map[idx] = "phone";
      else if (bitrixTarget === "email_alt") map[idx] = "email";
      else if (bitrixTarget === "leadPerson_alt") map[idx] = "leadPerson";
      else if (bitrixTarget === "city" || bitrixTarget === "country") map[idx] = "location";
      else if (bitrixTarget) map[idx] = bitrixTarget;
      else map[idx] = FLEXIBLE_HEADERS[clean] || "ignore";
    } else {
      map[idx] = FLEXIBLE_HEADERS[clean] || "ignore";
    }
  });
  return map;
}

export function parseImportDate(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0];
  const cleaned = raw.trim();

  // DD.MM.YYYY (Bitrix24)
  const dotMatch = cleaned.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (dotMatch) return `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.slice(0, 10);

  // MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) year += 2000;
    const [month, day] = first > 12 ? [second, first] : [first, second];
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Fallback JS Date parser
  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}

export function matchLeadStage(raw: string): ValidLeadStage {
  if (!raw) return "New Lead";
  const cleaned = raw.trim();
  const exact = VALID_LEAD_STAGES.find((s) => s === cleaned);
  if (exact) return exact;
  const lower = cleaned.toLowerCase();
  const matched = VALID_LEAD_STAGES.find((s) => s.toLowerCase() === lower);
  if (matched) return matched;
  if (lower.includes("follow")) return "Follow Up";
  if (lower.includes("qualif")) return "Qualified";
  if (lower.includes("enroll") || lower.includes("placed") || lower.includes("won")) return "Enrolled";
  if (lower.includes("connect")) return "Connected";
  if (lower.includes("not int")) return "Not Interested";
  return "New Lead";
}

/**
 * Applies a column mapping dictionary to raw spreadsheet rows, yielding normalized
 * CRM import rows ready for duplicate inspection and batch persistence.
 */
export function normalizeMappedRows(
  dataRows: string[][],
  columnMap: Record<number, TargetFieldKey>,
  defaultSource = "Spreadsheet Import"
): NormalizedImportRow[] {
  const results: NormalizedImportRow[] = [];

  dataRows.forEach((cells, idx) => {
    const raw: Partial<Record<TargetFieldKey, string>> = {};

    Object.entries(columnMap).forEach(([colIdxStr, fieldKey]) => {
      if (fieldKey === "ignore") return;
      const colIdx = Number(colIdxStr);
      const val = (cells[colIdx] ?? "").trim();
      if (!val) return;
      if (!raw[fieldKey]) {
        raw[fieldKey] = val;
      } else if (fieldKey === "remark" && !raw.remark!.includes(val)) {
        raw.remark = `${raw.remark}; ${val}`;
      } else if (fieldKey === "location" && !raw.location!.includes(val)) {
        raw.location = `${raw.location}, ${val}`;
      }
    });

    const fullName =
      raw.name ||
      [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim();

    if (!fullName) return;

    const leadSource = raw.leadSource || defaultSource;
    const accountRef = raw.accountRef || "";
    const technology = raw.technology || "";

    results.push({
      rowIndex: idx + 2,
      name: fullName,
      date: parseImportDate(raw.date || ""),
      location: raw.location || "USA",
      phone: raw.phone || "",
      email: raw.email || "",
      linkedin: raw.linkedin || "",
      visaStatus: raw.visaStatus || "",
      experience: raw.experience || "",
      leadType: raw.leadType || "Cold Lead",
      leadSource,
      leadPerson: raw.leadPerson || "Yatri",
      salesPerson: raw.salesPerson || "Support Admin",
      technology,
      accountRef,
      remark: raw.remark || "",
      stage: matchLeadStage(raw.stage || ""),
      company: accountRef || technology || "Independent Candidate",
    });
  });

  return results;
}

/**
 * Generates and downloads an Excel (.xlsx) workbook in the browser.
 */
export function downloadWorkbookXlsx(
  filename: string,
  sheetName: string,
  rows: Record<string, string | number>[]
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    ws["!cols"] = keys.map((k) => {
      const maxLen = Math.max(
        k.length,
        ...rows.slice(0, 100).map((r) => String(r[k] ?? "").length)
      );
      return { wch: Math.min(42, Math.max(12, maxLen + 2)) };
    });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
