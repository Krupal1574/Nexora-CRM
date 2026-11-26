export interface ParsedGoogleSheetRef {
  spreadsheetId: string;
  gid: string;
  isPublishedUrl: boolean;
  csvUrl: string;
}

/**
 * Validates and extracts spreadsheet ID, gid, and direct CSV fetch URL from
 * any Google Sheets link (standard /edit link, published /d/e/.../pub link, or raw Sheet ID).
 */
export function parseGoogleSheetUrl(rawInput: string, sheetName?: string): ParsedGoogleSheetRef {
  const input = (rawInput || "").trim();
  if (!input) {
    throw new Error("Please paste a Google Sheets URL or Spreadsheet ID.");
  }

  // Raw spreadsheet ID (alphanumeric, -, _ of length >= 20)
  if (!input.includes("://") && /^[a-zA-Z0-9-_]{20,}$/.test(input)) {
    const csvUrl = sheetName?.trim()
      ? `https://docs.google.com/spreadsheets/d/${input}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName.trim())}`
      : `https://docs.google.com/spreadsheets/d/${input}/export?format=csv&gid=0`;
    return {
      spreadsheetId: input,
      gid: "0",
      isPublishedUrl: false,
      csvUrl,
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(input);
  } catch {
    throw new Error("Invalid URL format. Paste the full https://docs.google.com/spreadsheets/d/... link.");
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("Only HTTP/HTTPS Google Sheets URLs are supported.");
  }

  if (parsedUrl.hostname !== "docs.google.com" && parsedUrl.hostname !== "sheets.googleapis.com") {
    throw new Error("URL must point to docs.google.com/spreadsheets.");
  }

  // Extract gid from query params or hash (#gid=12345)
  let gid = parsedUrl.searchParams.get("gid") || "0";
  if (parsedUrl.hash) {
    const hashMatch = parsedUrl.hash.match(/gid=(\d+)/);
    if (hashMatch) gid = hashMatch[1];
  }

  // Published-to-web URL format: /spreadsheets/d/e/2PACX-.../pub?output=csv
  const pubMatch = parsedUrl.pathname.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch) {
    const pubId = pubMatch[1];
    const url = new URL(`https://docs.google.com/spreadsheets/d/e/${pubId}/pub`);
    url.searchParams.set("output", "csv");
    if (gid && gid !== "0") url.searchParams.set("gid", gid);
    return {
      spreadsheetId: pubId,
      gid,
      isPublishedUrl: true,
      csvUrl: url.toString(),
    };
  }

  // Standard spreadsheet URL: /spreadsheets/d/<ID>/edit...
  const idMatch = parsedUrl.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) {
    throw new Error("Could not find a Spreadsheet ID in that Google Sheets URL.");
  }

  const spreadsheetId = idMatch[1];
  const csvUrl = sheetName?.trim()
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName.trim())}`
    : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`;

  return {
    spreadsheetId,
    gid,
    isPublishedUrl: false,
    csvUrl,
  };
}

export interface GoogleSheetFetchResult {
  csvText: string;
  spreadsheetId: string;
  gid: string;
  sheetTitle?: string;
  availableTabs?: { title: string; gid: string }[];
}

/**
 * Fetches CSV data directly from Google Sheets on the server (avoiding browser CORS),
 * with optional Sheets API v4 metadata discovery when GOOGLE_SHEETS_API_KEY is present.
 */
export async function fetchGoogleSheetCsv(
  rawUrl: string,
  sheetName?: string
): Promise<GoogleSheetFetchResult> {
  const ref = parseGoogleSheetUrl(rawUrl, sheetName);

  // Optional metadata lookup if API key is configured
  let sheetTitle: string | undefined;
  let availableTabs: { title: string; gid: string }[] | undefined;

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (apiKey && !ref.isPublishedUrl) {
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(ref.spreadsheetId)}?fields=properties.title,sheets.properties&key=${encodeURIComponent(apiKey)}`,
        { cache: "no-store" }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        sheetTitle = meta?.properties?.title;
        if (Array.isArray(meta?.sheets)) {
          availableTabs = meta.sheets.map((s: any) => ({
            title: String(s.properties?.title || "Sheet"),
            gid: String(s.properties?.sheetId ?? 0),
          }));
        }
      }
    } catch {
      // Metadata lookup is best-effort only
    }
  }

  const res = await fetch(ref.csvUrl, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
    headers: {
      Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
      "User-Agent": "Nexora-CRM-SheetSync/1.0",
    },
  });

  if (res.status === 401 || res.status === 403 || res.url.includes("accounts.google.com")) {
    throw new Error(
      "Google Sheet is private or requires sign-in. In Google Sheets, click Share → General access → 'Anyone with the link' (Viewer), or File → Share → Publish to web (CSV)."
    );
  }

  if (!res.ok) {
    throw new Error(`Google Sheets returned HTTP ${res.status}. Verify the link and sheet tab name.`);
  }

  const text = await res.text();
  const trimmedHead = text.trimStart().slice(0, 200).toLowerCase();
  if (trimmedHead.startsWith("<!doctype html") || trimmedHead.startsWith("<html")) {
    throw new Error(
      "Google Sheets returned a web sign-in page instead of CSV data. Set the sheet to 'Anyone with the link can view' or use 'Publish to web → CSV'."
    );
  }

  if (!text.trim()) {
    throw new Error("The selected Google Sheet tab is empty.");
  }

  return {
    csvText: text,
    spreadsheetId: ref.spreadsheetId,
    gid: ref.gid,
    sheetTitle,
    availableTabs,
  };
}
