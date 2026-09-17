import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "../../../lib/supabase/config";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "growth-tool",
    mode: hasSupabaseConfig() ? "private-beta" : "credential-setup",
    integrations: {
      auth: hasSupabaseConfig(),
      creativeAi: Boolean(process.env.OPENAI_API_KEY),
      creativeImageAi: Boolean(process.env.OPENAI_API_KEY),
      backgroundRemoval: Boolean(process.env.PHOTOROOM_API_KEY),
      trends: {
        naver: Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET),
        x: Boolean(process.env.X_BEARER_TOKEN),
        tiktok: Boolean(process.env.TIKTOK_TRENDS_API_URL),
      },
      adPerformance: {
        meta: Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID),
        tiktok: Boolean(process.env.TIKTOK_ADS_ACCESS_TOKEN && process.env.TIKTOK_ADVERTISER_ID),
        googleAds: Boolean(process.env.GOOGLE_ADS_CLIENT_ID && process.env.GOOGLE_ADS_REFRESH_TOKEN && process.env.GOOGLE_ADS_CUSTOMER_ID),
        moloco: Boolean(process.env.MOLOCO_API_KEY && process.env.MOLOCO_AD_ACCOUNT_ID),
      },
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
