export type DuplicateMatchReason = "email" | "phone" | "linkedin" | "name";

export interface DuplicateMatchOptions {
  matchByEmail: boolean;
  matchByPhone: boolean;
  matchByLinkedin: boolean;
  matchByName: boolean;
  ignorePlaceholders?: boolean;
}

export const DEFAULT_DUPLICATE_OPTIONS: DuplicateMatchOptions = {
  matchByEmail: true,
  matchByPhone: true,
  matchByLinkedin: true,
  matchByName: false,
  ignorePlaceholders: true,
};

export interface DedupeComparableRecord {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  profileUrl?: string | null;
  technology?: string | null;
  role?: string | null;
  location?: string | null;
  visaStatus?: string | null;
  experience?: string | null;
  leadType?: string | null;
  leadSource?: string | null;
  leadPerson?: string | null;
  salesPerson?: string | null;
  accountRef?: string | null;
  remark?: string | null;
  stage?: string | null;
  date?: string | null;
  createdAt?: string | Date | null;
}

const PLACEHOLDER_EMAILS = new Set([
  "na@gmail.com",
  "n/a@gmail.com",
  "none@gmail.com",
  "test@gmail.com",
  "test@test.com",
  "123@gmail.com",
  "123abc@gmail.com",
  "abc@gmail.com",
  "noemail@gmail.com",
  "example@example.com",
]);

const PLACEHOLDER_PHONES = new Set([
  "0000000000",
  "1111111111",
  "1234567890",
  "0123456789",
  "9876543210",
  "9999999999",
]);

export function normalizeEmail(raw?: string | null, ignorePlaceholders = true): string {
  if (!raw) return "";
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned.includes("@")) return "";
  if (ignorePlaceholders && (PLACEHOLDER_EMAILS.has(cleaned) || cleaned.endsWith("@example.com"))) {
    return "";
  }
  return cleaned;
}

export function normalizePhone(raw?: string | null, ignorePlaceholders = true): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return "";
  const key = digits.length >= 10 ? digits.slice(-10) : digits;
  if (ignorePlaceholders) {
    if (PLACEHOLDER_PHONES.has(key) || /^(\d)\1+$/.test(key)) {
      return "";
    }
  }
  return key;
}

export function normalizeLinkedin(raw?: string | null): string {
  if (!raw) return "";
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === "na" || trimmed === "n/a" || trimmed === "-") return "";
  const stripped = trimmed
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+$/, "");
  if (!stripped || stripped.length < 6) return "";
  return stripped;
}

export function normalizeName(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/[/\\]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface AnalyzedImportRow<T extends Record<string, any>> {
  row: T;
  index: number;
  status: "new" | "db_duplicate" | "file_duplicate";
  matchedExistingId?: string;
  matchedExistingName?: string;
  matchedFileRowIndex?: number;
  matchReasons: DuplicateMatchReason[];
}

export interface DuplicateAnalysisResult<T extends Record<string, any>> {
  items: AnalyzedImportRow<T>[];
  newCount: number;
  dbDuplicateCount: number;
  fileDuplicateCount: number;
}

/**
 * Analyzes incoming spreadsheet rows against existing CRM database records and
 * earlier rows in the same batch using O(N + M) hash indexes.
 */
export function analyzeImportDuplicates<
  T extends {
    rowIndex?: number;
    name: string;
    email?: string;
    phone?: string;
    linkedin?: string;
  }
>(
  incoming: T[],
  existing: DedupeComparableRecord[],
  options: DuplicateMatchOptions = DEFAULT_DUPLICATE_OPTIONS
): DuplicateAnalysisResult<T> {
  const ignorePh = options.ignorePlaceholders ?? true;

  const dbByEmail = new Map<string, DedupeComparableRecord>();
  const dbByPhone = new Map<string, DedupeComparableRecord>();
  const dbByLinkedin = new Map<string, DedupeComparableRecord>();
  const dbByName = new Map<string, DedupeComparableRecord>();

  for (const rec of existing) {
    const em = normalizeEmail(rec.email, ignorePh);
    if (em && !dbByEmail.has(em)) dbByEmail.set(em, rec);

    const ph = normalizePhone(rec.phone, ignorePh);
    if (ph && !dbByPhone.has(ph)) dbByPhone.set(ph, rec);

    const li = normalizeLinkedin(rec.linkedin || rec.profileUrl);
    if (li && !dbByLinkedin.has(li)) dbByLinkedin.set(li, rec);

    const nm = normalizeName(rec.name);
    if (nm && !dbByName.has(nm)) dbByName.set(nm, rec);
  }

  const fileByEmail = new Map<string, number>();
  const fileByPhone = new Map<string, number>();
  const fileByLinkedin = new Map<string, number>();
  const fileByName = new Map<string, number>();

  let newCount = 0;
  let dbDuplicateCount = 0;
  let fileDuplicateCount = 0;

  const items: AnalyzedImportRow<T>[] = incoming.map((row, index) => {
    const em = options.matchByEmail ? normalizeEmail(row.email, ignorePh) : "";
    const ph = options.matchByPhone ? normalizePhone(row.phone, ignorePh) : "";
    const li = options.matchByLinkedin ? normalizeLinkedin(row.linkedin) : "";
    const nm = options.matchByName ? normalizeName(row.name) : "";

    const dbReasons: DuplicateMatchReason[] = [];
    let matchedDb: DedupeComparableRecord | undefined;

    if (em && dbByEmail.has(em)) {
      dbReasons.push("email");
      matchedDb = matchedDb || dbByEmail.get(em);
    }
    if (ph && dbByPhone.has(ph)) {
      dbReasons.push("phone");
      matchedDb = matchedDb || dbByPhone.get(ph);
    }
    if (li && dbByLinkedin.has(li)) {
      dbReasons.push("linkedin");
      matchedDb = matchedDb || dbByLinkedin.get(li);
    }
    if (nm && dbByName.has(nm)) {
      dbReasons.push("name");
      matchedDb = matchedDb || dbByName.get(nm);
    }

    if (matchedDb) {
      dbDuplicateCount++;
      return {
        row,
        index,
        status: "db_duplicate",
        matchedExistingId: matchedDb.id,
        matchedExistingName: matchedDb.name,
        matchReasons: dbReasons,
      };
    }

    const fileReasons: DuplicateMatchReason[] = [];
    let matchedFileIdx: number | undefined;

    if (em && fileByEmail.has(em)) {
      fileReasons.push("email");
      matchedFileIdx = matchedFileIdx ?? fileByEmail.get(em);
    }
    if (ph && fileByPhone.has(ph)) {
      fileReasons.push("phone");
      matchedFileIdx = matchedFileIdx ?? fileByPhone.get(ph);
    }
    if (li && fileByLinkedin.has(li)) {
      fileReasons.push("linkedin");
      matchedFileIdx = matchedFileIdx ?? fileByLinkedin.get(li);
    }
    if (nm && fileByName.has(nm)) {
      fileReasons.push("name");
      matchedFileIdx = matchedFileIdx ?? fileByName.get(nm);
    }

    if (matchedFileIdx !== undefined) {
      fileDuplicateCount++;
      return {
        row,
        index,
        status: "file_duplicate",
        matchedFileRowIndex: incoming[matchedFileIdx]?.rowIndex ?? matchedFileIdx + 2,
        matchReasons: fileReasons,
      };
    }

    if (em) fileByEmail.set(em, index);
    if (ph) fileByPhone.set(ph, index);
    if (li) fileByLinkedin.set(li, index);
    if (nm) fileByName.set(nm, index);

    newCount++;
    return {
      row,
      index,
      status: "new",
      matchReasons: [],
    };
  });

  return {
    items,
    newCount,
    dbDuplicateCount,
    fileDuplicateCount,
  };
}

export interface DuplicateCluster<T extends DedupeComparableRecord = DedupeComparableRecord> {
  clusterId: string;
  primary: T;
  duplicates: T[];
  records: T[];
  reasons: DuplicateMatchReason[];
  matchKeySummary: string;
  confidence: "high" | "medium";
}

function recordCompletenessScore(rec: DedupeComparableRecord): number {
  let score = 0;
  if (rec.email && normalizeEmail(rec.email)) score += 3;
  if (rec.phone && normalizePhone(rec.phone)) score += 3;
  if (rec.linkedin || rec.profileUrl) score += 2;
  if (rec.technology || rec.role) score += 2;
  if (rec.visaStatus) score += 1;
  if (rec.experience) score += 1;
  if (rec.remark) score += 2;
  if (rec.accountRef) score += 1;
  if (rec.stage && rec.stage !== "New Lead" && rec.stage !== "New") score += 2;
  return score;
}

/**
 * Groups existing database records into duplicate clusters using Union-Find across
 * normalized email, phone, LinkedIn URL, and optional exact full name.
 */
export function findDuplicateClusters<T extends DedupeComparableRecord>(
  records: T[],
  options: DuplicateMatchOptions = DEFAULT_DUPLICATE_OPTIONS
): DuplicateCluster<T>[] {
  const n = records.length;
  if (n < 2) return [];

  const ignorePh = options.ignorePlaceholders ?? true;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    let cur = i;
    while (parent[cur] !== root) {
      const next = parent[cur];
      parent[cur] = root;
      cur = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const clusterReasons = new Map<number, Set<DuplicateMatchReason>>();
  const clusterKeys = new Map<number, Set<string>>();

  const connectBucket = (
    bucket: Map<string, number[]>,
    reason: DuplicateMatchReason,
    labelPrefix: string
  ) => {
    for (const [key, indices] of bucket.entries()) {
      if (indices.length < 2) continue;
      const first = indices[0];
      for (let j = 1; j < indices.length; j++) {
        union(first, indices[j]);
      }
      const root = find(first);
      if (!clusterReasons.has(root)) clusterReasons.set(root, new Set());
      if (!clusterKeys.has(root)) clusterKeys.set(root, new Set());
      clusterReasons.get(root)!.add(reason);
      clusterKeys.get(root)!.add(`${labelPrefix}: ${key}`);
    }
  };

  const byEmail = new Map<string, number[]>();
  const byPhone = new Map<string, number[]>();
  const byLinkedin = new Map<string, number[]>();
  const byName = new Map<string, number[]>();

  for (let i = 0; i < n; i++) {
    const rec = records[i];
    if (options.matchByEmail) {
      const em = normalizeEmail(rec.email, ignorePh);
      if (em) {
        if (!byEmail.has(em)) byEmail.set(em, []);
        byEmail.get(em)!.push(i);
      }
    }
    if (options.matchByPhone) {
      const ph = normalizePhone(rec.phone, ignorePh);
      if (ph) {
        if (!byPhone.has(ph)) byPhone.set(ph, []);
        byPhone.get(ph)!.push(i);
      }
    }
    if (options.matchByLinkedin) {
      const li = normalizeLinkedin(rec.linkedin || rec.profileUrl);
      if (li) {
        if (!byLinkedin.has(li)) byLinkedin.set(li, []);
        byLinkedin.get(li)!.push(i);
      }
    }
    if (options.matchByName) {
      const nm = normalizeName(rec.name);
      if (nm) {
        if (!byName.has(nm)) byName.set(nm, []);
        byName.get(nm)!.push(i);
      }
    }
  }

  connectBucket(byEmail, "email", "Email");
  connectBucket(byPhone, "phone", "Phone");
  connectBucket(byLinkedin, "linkedin", "LinkedIn");
  connectBucket(byName, "name", "Name");

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  // Merge reason/key metadata under final Union-Find roots
  const finalReasons = new Map<number, Set<DuplicateMatchReason>>();
  const finalKeys = new Map<number, Set<string>>();
  for (const [oldRoot, rSet] of clusterReasons.entries()) {
    const root = find(oldRoot);
    if (!finalReasons.has(root)) finalReasons.set(root, new Set());
    rSet.forEach((r) => finalReasons.get(root)!.add(r));
  }
  for (const [oldRoot, kSet] of clusterKeys.entries()) {
    const root = find(oldRoot);
    if (!finalKeys.has(root)) finalKeys.set(root, new Set());
    kSet.forEach((k) => finalKeys.get(root)!.add(k));
  }

  const clusters: DuplicateCluster<T>[] = [];
  for (const [root, indices] of groups.entries()) {
    if (indices.length < 2) continue;

    const recs = indices
      .map((i) => records[i])
      .sort((a, b) => recordCompletenessScore(b) - recordCompletenessScore(a));

    const reasons = Array.from(finalReasons.get(root) ?? []);
    const keys = Array.from(finalKeys.get(root) ?? []).slice(0, 3);
    const hasStrongSignal = reasons.some((r) => r === "email" || r === "phone" || r === "linkedin");

    clusters.push({
      clusterId: `cluster-${recs[0].id}`,
      primary: recs[0],
      duplicates: recs.slice(1),
      records: recs,
      reasons,
      matchKeySummary: keys.join(" • "),
      confidence: hasStrongSignal ? "high" : "medium",
    });
  }

  return clusters.sort((a, b) => b.records.length - a.records.length);
}
