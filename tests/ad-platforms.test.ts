import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultDateRange, getPerformanceFeed, summarizePerformance, type AdMetricRow } from "../lib/ad-platforms";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

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

  it("normalizes Meta purchase actions without exposing its token", async () => {
    vi.stubEnv("META_ACCESS_TOKEN", "secret-meta-token");
    vi.stubEnv("META_AD_ACCOUNT_ID", "123");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ date_start: "2026-09-16", account_id: "123", account_currency: "KRW", ad_id: "ad-1", ad_name: "세럼 A", impressions: "1000", clicks: "20", spend: "10000", actions: [{ action_type: "purchase", value: "2" }], action_values: [{ action_type: "purchase", value: "30000" }] }] }), { status: 200 })));

    const feed = await getPerformanceFeed({ since: "2026-09-16", until: "2026-09-16" });
    expect(feed.rows).toEqual([expect.objectContaining({ platform: "meta", adId: "ad-1", impressions: 1000, purchases: 2, revenue: 30000 })]);
    expect(JSON.stringify(feed)).not.toContain("secret-meta-token");
  });

  it("normalizes TikTok integrated reporting rows", async () => {
    vi.stubEnv("TIKTOK_ADS_ACCESS_TOKEN", "secret-tiktok-token");
    vi.stubEnv("TIKTOK_ADVERTISER_ID", "adv-1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 0, data: { list: [{ dimensions: { ad_id: "tt-ad", stat_time_day: "2026-09-16" }, metrics: { campaign_id: "campaign", ad_name: "쿠션 A", impressions: "500", clicks: "10", spend: "5000", conversion: "1", total_purchase_value: "15000" } }] } }), { status: 200 })));

    const feed = await getPerformanceFeed({ since: "2026-09-16", until: "2026-09-16" });
    expect(feed.rows).toEqual([expect.objectContaining({ platform: "tiktok", adId: "tt-ad", clicks: 10, spend: 5000, revenue: 15000 })]);
  });

  it("converts Google Ads micros after OAuth refresh", async () => {
    vi.stubEnv("GOOGLE_ADS_CLIENT_ID", "client");
    vi.stubEnv("GOOGLE_ADS_CLIENT_SECRET", "secret");
    vi.stubEnv("GOOGLE_ADS_REFRESH_TOKEN", "refresh");
    vi.stubEnv("GOOGLE_ADS_CUSTOMER_ID", "123-456");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ results: [{ segments: { date: "2026-09-16" }, customer: { currencyCode: "KRW" }, campaign: { id: "c1", name: "검색" }, adGroupAd: { ad: { id: "g-ad" } }, metrics: { impressions: "200", clicks: "4", costMicros: "2500000", conversions: "1", conversionsValue: "7000" } }] }]), { status: 200 })));

    const feed = await getPerformanceFeed({ since: "2026-09-16", until: "2026-09-16" });
    expect(feed.rows).toEqual([expect.objectContaining({ platform: "google-ads", accountId: "123456", adId: "g-ad", spend: 2.5, revenue: 7000 })]);
  });

  it("refreshes a Moloco token and normalizes analytics detail", async () => {
    vi.stubEnv("MOLOCO_API_KEY", "moloco-key");
    vi.stubEnv("MOLOCO_AD_ACCOUNT_ID", "moloco-account");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "moloco-access" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ rows: [{ date: "2026-09-16", ad_account: { currency: "KRW" }, campaign: { id: "mc", title: "리타겟팅" }, creative: { id: "m-ad", title: "세럼 B" }, metric: { impressions: "300", clicks: "6", spend: 4000, revenue: 12000 } }] }), { status: 200 })));

    const feed = await getPerformanceFeed({ since: "2026-09-16", until: "2026-09-16" });
    expect(feed.rows).toEqual([expect.objectContaining({ platform: "moloco", adId: "m-ad", impressions: 300, spend: 4000, revenue: 12000 })]);
  });
});
