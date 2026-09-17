import { describe, expect, it } from "vitest";
import { calculatePerformance, parseMetricsCsv } from "../lib/metrics";

describe("parseMetricsCsv", () => {
  it("sums a standard report without averaging daily rates", () => {
    const result = parseMetricsCsv("impressions,link_clicks,spend,purchases,purchase_value\n12000,156,78000,6,468000\n14800,207,103500,9,702000");
    expect(result).toEqual({ impressions: 26800, clicks: 363, spend: 181500, purchases: 15, revenue: 1170000 });
  });

  it("requires the three base metrics", () => {
    expect(parseMetricsCsv("impressions,spend\n10,100")).toBeNull();
  });

  it("supports quoted currency values without splitting thousands separators", () => {
    expect(parseMetricsCsv('impressions,link_clicks,spend\n"12,000",156,"₩78,000"')).toEqual({ impressions: 12000, clicks: 156, spend: 78000 });
  });

  it("rejects invalid and negative numeric data", () => {
    expect(parseMetricsCsv("impressions,link_clicks,spend\n100,oops,500")).toBeNull();
    expect(parseMetricsCsv("impressions,link_clicks,spend\n100,10,-500")).toBeNull();
  });
});

describe("calculatePerformance", () => {
  it("preserves unavailable purchase metrics and zero denominators", () => {
    expect(calculatePerformance({ impressions: 10000, clicks: 120, spend: 60000 })).toEqual({ ctr: 1.2, cpc: 500, cvr: null, roas: null });
    expect(calculatePerformance({ impressions: 0, clicks: 0, spend: 0, purchases: 0, revenue: 0 })).toEqual({ ctr: null, cpc: null, cvr: null, roas: null });
  });
});
