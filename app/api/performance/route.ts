import { NextResponse } from "next/server";
import { defaultDateRange, getPerformanceFeed } from "../../../lib/ad-platforms";
import { hasSupabaseConfig } from "../../../lib/supabase/config";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const hasCredentials = Boolean(
    (process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID) ||
    (process.env.TIKTOK_ADS_ACCESS_TOKEN && process.env.TIKTOK_ADVERTISER_ID) ||
    (process.env.GOOGLE_ADS_CLIENT_ID && process.env.GOOGLE_ADS_REFRESH_TOKEN && process.env.GOOGLE_ADS_CUSTOMER_ID) ||
    (process.env.MOLOCO_API_KEY && process.env.MOLOCO_AD_ACCOUNT_ID),
  );
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  } else if (hasCredentials && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "AUTH_REQUIRED_FOR_AD_DATA" }, { status: 503 });
  }
  const url = new URL(request.url); const defaults = defaultDateRange();
  const since = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("since") || "") ? url.searchParams.get("since")! : defaults.since;
  const until = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("until") || "") ? url.searchParams.get("until")! : defaults.until;
  if (since > until) return NextResponse.json({ error: "INVALID_DATE_RANGE" }, { status: 400 });
  return NextResponse.json(await getPerformanceFeed({ since, until }), { headers: { "Cache-Control": "no-store" } });
}
