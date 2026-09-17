import { hasSupabaseConfig } from "./supabase/config";

export function getIntegrationHealth() {
  const auth = hasSupabaseConfig();
  const creativeAi = Boolean(process.env.OPENAI_API_KEY);
  const trends = {
    naver: Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET),
    x: Boolean(process.env.X_BEARER_TOKEN),
    tiktok: Boolean(process.env.TIKTOK_TRENDS_API_URL),
  };
  const adPerformance = {
    meta: Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID),
    tiktok: Boolean(process.env.TIKTOK_ADS_ACCESS_TOKEN && process.env.TIKTOK_ADVERTISER_ID),
    googleAds: Boolean(
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN &&
      process.env.GOOGLE_ADS_CUSTOMER_ID,
    ),
    moloco: Boolean(process.env.MOLOCO_API_KEY && process.env.MOLOCO_AD_ACCOUNT_ID),
  };
  const gates = {
    authenticatedWorkspace: auth,
    liveTrend: Object.values(trends).some(Boolean),
    productImageGeneration: auth && creativeAi,
    liveAdPerformance: auth && Object.values(adPerformance).some(Boolean),
  };

  return {
    mode: auth ? "private-beta" as const : "credential-setup" as const,
    integrations: {
      auth,
      creativeAi,
      creativeImageAi: creativeAi,
      backgroundRemoval: Boolean(process.env.PHOTOROOM_API_KEY),
      trends,
      adPerformance,
    },
    gates,
    launchReady: Object.values(gates).every(Boolean),
  };
}
