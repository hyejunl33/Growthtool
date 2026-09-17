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

function numberValue(value: string | undefined) {
  const parsed = Number((value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseMetricsCsv(text: string): Metric | null {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;

  const headers = lines[0].split(",").map((item) => item.trim().toLowerCase());
  const impressionsIndex = columnIndex(headers, requiredAliases.impressions);
  const clicksIndex = columnIndex(headers, requiredAliases.clicks);
  const spendIndex = columnIndex(headers, requiredAliases.spend);
  if ([impressionsIndex, clicksIndex, spendIndex].some((index) => index < 0)) return null;

  const purchasesIndex = columnIndex(headers, ["purchases", "구매"]);
  const revenueIndex = columnIndex(headers, ["purchase_value", "revenue", "구매금액"]);
  const total: Metric = { impressions: 0, clicks: 0, spend: 0 };

  for (const line of lines.slice(1)) {
    const row = line.split(",");
    total.impressions += numberValue(row[impressionsIndex]);
    total.clicks += numberValue(row[clicksIndex]);
    total.spend += numberValue(row[spendIndex]);
    if (purchasesIndex >= 0) total.purchases = (total.purchases || 0) + numberValue(row[purchasesIndex]);
    if (revenueIndex >= 0) total.revenue = (total.revenue || 0) + numberValue(row[revenueIndex]);
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
