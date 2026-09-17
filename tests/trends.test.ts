import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyTrendFreshness, getTrendFeed } from "../lib/trends";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("classifyTrendFreshness", () => {
  const now = new Date("2026-09-17T12:00:00+09:00");

  it("marks observations within two days as fresh", () => {
    expect(classifyTrendFreshness("2026-09-15", now)).toBe("fresh");
  });

  it("distinguishes delayed and expired source data", () => {
    expect(classifyTrendFreshness("2026-09-14", now)).toBe("delayed");
    expect(classifyTrendFreshness("2026-09-09", now)).toBe("expired");
  });

  it("normalizes real Naver beauty keyword ratios", async () => {
    vi.stubEnv("NAVER_CLIENT_ID", "naver-id");
    vi.stubEnv("NAVER_CLIENT_SECRET", "naver-secret");
    vi.stubEnv("NAVER_TREND_KEYWORDS_JSON", JSON.stringify([{ name: "수분 세럼", param: ["수분 세럼"], description: "수분 탐색 신호" }]));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ title: "수분 세럼", data: [{ period: "2026-09-14", ratio: 20 }, { period: "2026-09-15", ratio: 30 }, { period: "2026-09-16", ratio: 40 }] }] }), { status: 200 })));

    const feed = await getTrendFeed();
    expect(fetch).toHaveBeenCalledWith(
      "https://naverapihub.apigw.ntruss.com/shopping/v1/category/keywords",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-NCP-APIGW-API-KEY-ID": "naver-id",
          "X-NCP-APIGW-API-KEY": "naver-secret",
        }),
      }),
    );
    expect(feed.trends).toEqual([expect.objectContaining({ provider: "naver-shopping", category: "뷰티", title: "수분 세럼", values: [20, 30, 40] })]);
    expect(JSON.stringify(feed)).not.toContain("naver-secret");
  });

  it("loads the public Naver beauty ranking without credentials", async () => {
    vi.stubEnv("NAVER_CLIENT_ID", "");
    vi.stubEnv("NAVER_CLIENT_SECRET", "");
    vi.stubEnv("NAVER_TREND_KEYWORDS_JSON", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { returnCode: 0, date: "2026/09/15", ranks: [{ rank: 3, keyword: "수분크림" }, { rank: 6, keyword: "마스크팩" }] },
      { returnCode: 0, date: "2026/09/16", ranks: [{ rank: 1, keyword: "수분크림" }, { rank: 4, keyword: "마스크팩" }] },
    ]), { status: 200 })));

    const feed = await getTrendFeed();
    expect(fetch).toHaveBeenCalledWith(
      "https://datalab.naver.com/shoppingInsight/getKeywordRank.naver?timeUnit=date&cid=50000002",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "X-Requested-With": "XMLHttpRequest" }) }),
    );
    expect(feed.trends[0]).toMatchObject({ provider: "naver-shopping", title: "수분크림", score: 100, values: [8, 10] });
    expect(feed.providers[0]).toMatchObject({ status: "live", observedAt: "2026-09-16" });
  });

  it("keeps only beauty-related X trends", async () => {
    vi.stubEnv("NAVER_PUBLIC_RANKING_ENABLED", "false");
    vi.stubEnv("X_BEARER_TOKEN", "x-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ trend_name: "수분크림", tweet_count: 1200 }, { trend_name: "야구 경기", tweet_count: 900 }] }), { status: 200 })));

    const feed = await getTrendFeed();
    expect(feed.trends.map((trend) => trend.title)).toEqual(["수분크림"]);
    expect(feed.trends[0]).toMatchObject({ provider: "x", category: "뷰티" });
  });

  it("accepts the licensed TikTok JSON feed contract", async () => {
    vi.stubEnv("NAVER_PUBLIC_RANKING_ENABLED", "false");
    vi.stubEnv("TIKTOK_TRENDS_API_URL", "https://provider.example/trends");
    vi.stubEnv("TIKTOK_TRENDS_API_TOKEN", "tiktok-trend-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ keyword: "glass skin", score: 91, growth: 18, values: [30, 45, 61], description: "뷰티 해시태그 상승", observedAt: "2026-09-17T00:00:00Z" }] }), { status: 200 })));

    const feed = await getTrendFeed();
    expect(feed.trends).toEqual([expect.objectContaining({ provider: "tiktok", title: "glass skin", score: 91, growth: 18 })]);
    expect(JSON.stringify(feed)).not.toContain("tiktok-trend-secret");
  });
});
