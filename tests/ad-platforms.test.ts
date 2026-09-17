import { describe, expect, it } from "vitest";
import { defaultDateRange, summarizePerformance, type AdMetricRow } from "../lib/ad-platforms";

describe("ad platform normalization", () => {
  it("computes cross-platform totals from normalized rows", () => {
    const rows: AdMetricRow[] = [
      { platform: "meta", date: "2026-09-16", accountId: "1", currency: "KRW", impressions: 1000, clicks: 20, spend: 10000, purchases: 2, revenue: 30000 },
      { platform: "google-ads", date: "2026-09-16", accountId: "2", currency: "KRW", impressions: 500, clicks: 10, spend: 5000, purchases: 1, revenue: 15000 },
    ];
    expect(summarizePerformance(rows)).toMatchObject({ impressions: 1500, clicks: 30, spend: 15000, purchases: 3, revenue: 45000, ctr: 2, cpc: 500, roas: 3 });
  });

  it("uses null for metrics with a zero denominator", () => {
    expect(summarizePerformance([])).toMatchObject({ ctr: null, cpc: null, roas: null });
  });

  it("creates an inclusive recent date window", () => {
    const range = defaultDateRange(14);
    expect(range.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.until).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.since <= range.until).toBe(true);
  });
});
