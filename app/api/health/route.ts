import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "../../../lib/supabase/config";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "growth-tool",
    mode: hasSupabaseConfig() ? "private-beta" : "demo",
    integrations: {
      auth: hasSupabaseConfig(),
      creativeAi: Boolean(process.env.OPENAI_API_KEY),
      backgroundRemoval: Boolean(process.env.PHOTOROOM_API_KEY),
      trendFeed: Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
