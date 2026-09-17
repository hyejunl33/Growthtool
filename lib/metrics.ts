export type Metric = {
  impressions: number;
  clicks: number;
  spend: number;
  purchases?: number;
  revenue?: number;
};

export type Performance = {
  ctr: number | null;
  cpc: number | null;
  cvr: number | null;
  roas: number | null;
};

const requiredAliases = {
  impressions: ["impressions", "노출"],
  clicks: ["link_clicks", "clicks", "클릭"],
  spend: ["spend", "비용"],
} as const;

function columnIndex(headers: string[], aliases: readonly string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field); field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else field += character;
  }
  if (quoted) return null;
  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function numberValue(value: string | undefined) {
  if (value === undefined || value.trim() === "") return null;
  const normalized = value.trim().replace(/[₩$€£,\s]/g, "");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseMetricsCsv(text: string): Metric | null {
  if (new TextEncoder().encode(text).byteLength > 5 * 1024 * 1024) return null;
  const rows = parseCsvRows(text.trim());
  if (!rows || rows.length < 2 || rows.length > 10_001) return null;

  const headers = rows[0].map((item) => item.replace(/^\uFEFF/, "").trim().toLowerCase());
  const impressionsIndex = columnIndex(headers, requiredAliases.impressions);
  const clicksIndex = columnIndex(headers, requiredAliases.clicks);
  const spendIndex = columnIndex(headers, requiredAliases.spend);
  if ([impressionsIndex, clicksIndex, spendIndex].some((index) => index < 0)) return null;

  const purchasesIndex = columnIndex(headers, ["purchases", "구매"]);
  const revenueIndex = columnIndex(headers, ["purchase_value", "revenue", "구매금액"]);
  const total: Metric = { impressions: 0, clicks: 0, spend: 0 };

  for (const row of rows.slice(1)) {
    const impressions = numberValue(row[impressionsIndex]);
    const clicks = numberValue(row[clicksIndex]);
    const spend = numberValue(row[spendIndex]);
    if (impressions === null || clicks === null || spend === null) return null;
    total.impressions += impressions;
    total.clicks += clicks;
    total.spend += spend;
    if (purchasesIndex >= 0) {
      const purchases = numberValue(row[purchasesIndex]);
      if (purchases === null) return null;
      total.purchases = (total.purchases || 0) + purchases;
    }
    if (revenueIndex >= 0) {
      const revenue = numberValue(row[revenueIndex]);
      if (revenue === null) return null;
      total.revenue = (total.revenue || 0) + revenue;
    }
  }
  return total;
}

export function calculatePerformance(metrics: Metric): Performance {
  return {
    ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : null,
    cpc: metrics.clicks > 0 ? metrics.spend / metrics.clicks : null,
    cvr: metrics.clicks > 0 && metrics.purchases !== undefined ? (metrics.purchases / metrics.clicks) * 100 : null,
    roas: metrics.spend > 0 && metrics.revenue !== undefined ? metrics.revenue / metrics.spend : null,
  };
}
