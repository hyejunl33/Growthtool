import { afterEach, describe, expect, it, vi } from "vitest";
import { getIntegrationHealth } from "../lib/health";

const keys = [
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "OPENAI_API_KEY",
  "JUDGE_ACCESS_CODE",
  "NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET", "NAVER_PUBLIC_RANKING_ENABLED", "X_BEARER_TOKEN", "TIKTOK_TRENDS_API_URL",
  "META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID", "TIKTOK_ADS_ACCESS_TOKEN", "TIKTOK_ADVERTISER_ID",
  "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CUSTOMER_ID",
  "MOLOCO_API_KEY", "MOLOCO_AD_ACCOUNT_ID",
];

function clearIntegrations() {
  for (const key of keys) vi.stubEnv(key, "");
  vi.stubEnv("NAVER_PUBLIC_RANKING_ENABLED", "false");
}

afterEach(() => vi.unstubAllEnvs());

describe("launch health", () => {
  it("keeps the release gate closed when credentials are absent", () => {
    clearIntegrations();
    expect(getIntegrationHealth()).toMatchObject({
      mode: "credential-setup",
      launchReady: false,
      gates: { testerAccess: false, liveTrend: false, productImageGeneration: false, liveAdPerformance: false },
    });
  });

  it("opens the minimum PRD release gate with auth, AI, one trend source, and one ad source", () => {
    clearIntegrations();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
    vi.stubEnv("OPENAI_API_KEY", "openai");
    vi.stubEnv("NAVER_CLIENT_ID", "naver-id");
    vi.stubEnv("NAVER_CLIENT_SECRET", "naver-secret");
    vi.stubEnv("META_ACCESS_TOKEN", "meta-token");
    vi.stubEnv("META_AD_ACCOUNT_ID", "123");
    expect(getIntegrationHealth()).toMatchObject({
      mode: "private-beta",
      launchReady: true,
      gates: { testerAccess: true, liveTrend: true, productImageGeneration: true, liveAdPerformance: true },
    });
  });

  it("accepts a protected judge session as the MVP tester access path", () => {
    clearIntegrations();
    vi.stubEnv("JUDGE_ACCESS_CODE", "judge-code-1234");
    vi.stubEnv("OPENAI_API_KEY", "openai");
    vi.stubEnv("X_BEARER_TOKEN", "x-token");
    expect(getIntegrationHealth()).toMatchObject({
      launchReady: true,
      integrations: { judgeAccess: true },
      gates: { testerAccess: true, liveTrend: true, productImageGeneration: true, liveAdPerformance: false },
    });
  });

  it("recognizes the built-in public Naver beauty ranking", () => {
    clearIntegrations();
    vi.stubEnv("NAVER_PUBLIC_RANKING_ENABLED", "true");
    expect(getIntegrationHealth().gates.liveTrend).toBe(true);
    expect(getIntegrationHealth().integrations.trends.naver).toBe(true);
  });

  it("does not mark Google Ads configured without its client secret", () => {
    clearIntegrations();
    vi.stubEnv("GOOGLE_ADS_CLIENT_ID", "client");
    vi.stubEnv("GOOGLE_ADS_REFRESH_TOKEN", "refresh");
    vi.stubEnv("GOOGLE_ADS_CUSTOMER_ID", "123");
    expect(getIntegrationHealth().integrations.adPerformance.googleAds).toBe(false);
  });
});
