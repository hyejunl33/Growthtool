export type AdPlatform = "meta" | "tiktok" | "google-ads" | "moloco";

export type AdMetricRow = {
  platform: AdPlatform;
  date: string;
  accountId: string;
  campaignId?: string;
  campaignName?: string;
  adId?: string;
  adName?: string;
  currency: string;
  impressions: number;
  clicks: number;
  spend: number;
  purchases?: number;
  revenue?: number;
};

export type AdConnectionStatus = {
  platform: AdPlatform;
  label: string;
  configured: boolean;
  status: "live" | "unconfigured" | "error";
  message: string;
  docsUrl: string;
  accountId?: string;
  syncedAt?: string;
};

export type PerformanceFeed = { range: { since: string; until: string }; rows: AdMetricRow[]; connections: AdConnectionStatus[]; refreshedAt: string };

const labels: Record<AdPlatform, string> = { meta: "Meta Ads", tiktok: "TikTok Ads", "google-ads": "Google Ads", moloco: "Moloco" };
const docs: Record<AdPlatform, string> = {
  meta: "https://developers.facebook.com/docs/marketing-api/insights/",
  tiktok: "https://business-api.tiktok.com/portal/docs",
  "google-ads": "https://developers.google.com/google-ads/api/docs/reporting/overview",
  moloco: "https://developer.moloco.cloud/reference/dspapi_queryanalyticsdetail",
};

function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function ymd(value: Date) { return value.toISOString().slice(0, 10); }
export function defaultDateRange(days = 14) { const until = new Date(); const since = new Date(until); since.setUTCDate(until.getUTCDate() - days + 1); return { since: ymd(since), until: ymd(until) }; }
function actionValue(actions: unknown, names: string[]) { if (!Array.isArray(actions)) return undefined; const item = actions.find((entry) => entry && typeof entry === "object" && names.includes(String((entry as { action_type?: unknown }).action_type))); return item ? number((item as { value?: unknown }).value) : undefined; }

async function meta(range: { since: string; until: string }) {
  const token = process.env.META_ACCESS_TOKEN; const rawAccount = process.env.META_AD_ACCOUNT_ID; const version = process.env.META_GRAPH_VERSION || "v25.0";
  if (!token || !rawAccount) return { rows: [], status: { platform: "meta", label: labels.meta, configured: false, status: "unconfigured", message: "Access Token과 광고 계정 ID가 필요해요.", docsUrl: docs.meta } satisfies AdConnectionStatus };
  const accountId = rawAccount.startsWith("act_") ? rawAccount : `act_${rawAccount}`;
  const params = new URLSearchParams({ access_token: token, fields: "date_start,account_id,account_currency,campaign_id,campaign_name,ad_id,ad_name,impressions,clicks,spend,actions,action_values", level: "ad", time_increment: "1", action_report_time: "conversion", time_range: JSON.stringify(range), limit: "500" });
  const response = await fetch(`https://graph.facebook.com/${version}/${accountId}/insights?${params}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`META_${response.status}`);
  const payload = await response.json() as { data?: Array<Record<string, unknown>> };
  const rows = (payload.data || []).map((row) => ({ platform: "meta", date: String(row.date_start || range.until), accountId: String(row.account_id || rawAccount), campaignId: String(row.campaign_id || "") || undefined, campaignName: String(row.campaign_name || "") || undefined, adId: String(row.ad_id || "") || undefined, adName: String(row.ad_name || "") || undefined, currency: String(row.account_currency || process.env.META_CURRENCY || "KRW"), impressions: number(row.impressions), clicks: number(row.clicks), spend: number(row.spend), purchases: actionValue(row.actions, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]), revenue: actionValue(row.action_values, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]) } satisfies AdMetricRow));
  return { rows, status: { platform: "meta", label: labels.meta, configured: true, status: "live", message: `${rows.length}개 광고 일별 행`, docsUrl: docs.meta, accountId: rawAccount, syncedAt: new Date().toISOString() } satisfies AdConnectionStatus };
}

async function tiktok(range: { since: string; until: string }) {
  const token = process.env.TIKTOK_ADS_ACCESS_TOKEN; const advertiserId = process.env.TIKTOK_ADVERTISER_ID;
  if (!token || !advertiserId) return { rows: [], status: { platform: "tiktok", label: labels.tiktok, configured: false, status: "unconfigured", message: "Access Token과 Advertiser ID가 필요해요.", docsUrl: docs.tiktok } satisfies AdConnectionStatus };
  const params = new URLSearchParams({ advertiser_id: advertiserId, report_type: "BASIC", data_level: "AUCTION_AD", dimensions: JSON.stringify(["ad_id", "stat_time_day"]), metrics: JSON.stringify(["campaign_id", "campaign_name", "ad_name", "spend", "impressions", "clicks", "conversion", "total_purchase_value"]), start_date: range.since, end_date: range.until, page_size: "1000" });
  const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params}`, { headers: { "Access-Token": token }, cache: "no-store" });
  if (!response.ok) throw new Error(`TIKTOK_ADS_${response.status}`);
  const payload = await response.json() as { code?: number; message?: string; data?: { list?: Array<{ dimensions?: Record<string, string>; metrics?: Record<string, string> }> } };
  if (payload.code && payload.code !== 0) throw new Error(`TIKTOK_ADS_${payload.code}_${payload.message || "ERROR"}`);
  const rows = (payload.data?.list || []).map(({ dimensions = {}, metrics = {} }) => ({ platform: "tiktok", date: dimensions.stat_time_day || range.until, accountId: advertiserId, campaignId: metrics.campaign_id, campaignName: metrics.campaign_name, adId: dimensions.ad_id, adName: metrics.ad_name, currency: process.env.TIKTOK_ADS_CURRENCY || "KRW", impressions: number(metrics.impressions), clicks: number(metrics.clicks), spend: number(metrics.spend), purchases: number(metrics.conversion), revenue: number(metrics.total_purchase_value) } satisfies AdMetricRow));
  return { rows, status: { platform: "tiktok", label: labels.tiktok, configured: true, status: "live", message: `${rows.length}개 광고 일별 행`, docsUrl: docs.tiktok, accountId: advertiserId, syncedAt: new Date().toISOString() } satisfies AdConnectionStatus };
}

async function googleAds(range: { since: string; until: string }) {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID; const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET; const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN; const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, "");
  if (!clientId || !clientSecret || !refreshToken || !customerId) return { rows: [], status: { platform: "google-ads", label: labels["google-ads"], configured: false, status: "unconfigured", message: "OAuth 자격증명·Refresh Token·Customer ID가 필요해요.", docsUrl: docs["google-ads"] } satisfies AdConnectionStatus };
  const auth = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }), cache: "no-store" });
  if (!auth.ok) throw new Error(`GOOGLE_OAUTH_${auth.status}`); const { access_token: accessToken } = await auth.json() as { access_token: string };
  const query = `SELECT segments.date, customer.currency_code, campaign.id, campaign.name, ad_group_ad.ad.id, ad_group_ad.ad.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM ad_group_ad WHERE segments.date BETWEEN '${range.since}' AND '${range.until}'`;
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  if (process.env.GOOGLE_ADS_DEVELOPER_TOKEN) headers["developer-token"] = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers["login-customer-id"] = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g, "");
  const response = await fetch(`https://googleads.googleapis.com/v25/customers/${customerId}/googleAds:searchStream`, { method: "POST", headers, body: JSON.stringify({ query }), cache: "no-store" });
  if (!response.ok) throw new Error(`GOOGLE_ADS_${response.status}`);
  type GoogleRow = { segments?: { date?: string }; customer?: { currencyCode?: string }; campaign?: { id?: string | number; name?: string }; adGroupAd?: { ad?: { id?: string | number; name?: string } }; metrics?: { impressions?: string | number; clicks?: string | number; costMicros?: string | number; conversions?: string | number; conversionsValue?: string | number } };
  const chunks = await response.json() as Array<{ results?: GoogleRow[] }>;
  const rows = chunks.flatMap((chunk) => chunk.results || []).map((row) => ({ platform: "google-ads", date: String(row.segments?.date || range.until), accountId: customerId, campaignId: String(row.campaign?.id || "") || undefined, campaignName: row.campaign?.name, adId: String(row.adGroupAd?.ad?.id || "") || undefined, adName: row.adGroupAd?.ad?.name, currency: row.customer?.currencyCode || "KRW", impressions: number(row.metrics?.impressions), clicks: number(row.metrics?.clicks), spend: number(row.metrics?.costMicros) / 1_000_000, purchases: number(row.metrics?.conversions), revenue: number(row.metrics?.conversionsValue) } satisfies AdMetricRow));
  return { rows, status: { platform: "google-ads", label: labels["google-ads"], configured: true, status: "live", message: `${rows.length}개 광고 일별 행`, docsUrl: docs["google-ads"], accountId: customerId, syncedAt: new Date().toISOString() } satisfies AdConnectionStatus };
}

async function moloco(range: { since: string; until: string }) {
  const apiKey = process.env.MOLOCO_API_KEY; const accountId = process.env.MOLOCO_AD_ACCOUNT_ID;
  if (!apiKey || !accountId) return { rows: [], status: { platform: "moloco", label: labels.moloco, configured: false, status: "unconfigured", message: "읽기 전용 API Key와 Ad Account ID가 필요해요.", docsUrl: docs.moloco } satisfies AdConnectionStatus };
  const auth = await fetch("https://api.moloco.cloud/cm/v1/auth/tokens", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ api_key: apiKey }), cache: "no-store" });
  if (!auth.ok) throw new Error(`MOLOCO_AUTH_${auth.status}`); const { token } = await auth.json() as { token: string };
  const response = await fetch("https://api.moloco.cloud/cm/v1/analytics-detail", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ ad_account_id: accountId, timezone: process.env.MOLOCO_TIMEZONE || "Asia/Seoul", date_range: { start: range.since, end: range.until }, dimensions: ["DATE", "CAMPAIGN", "CREATIVE"], metrics: ["IMPRESSIONS", "CLICKS", "SPEND", "REVENUE"], limit: "10000" }), cache: "no-store" });
  type MolocoRow = { date?: string; campaign?: { id?: string; title?: string }; creative?: { id?: string; title?: string }; ad_account?: { currency?: string }; metric?: Record<string, unknown>; metrics?: Record<string, unknown> };
  if (!response.ok) throw new Error(`MOLOCO_${response.status}`); const payload = await response.json() as { rows?: MolocoRow[]; data?: MolocoRow[] }; const items = Array.isArray(payload.rows) ? payload.rows : Array.isArray(payload.data) ? payload.data : [];
  const rows = items.map((row) => { const metric = row.metric || row.metrics || {}; return { platform: "moloco", date: String(row.date || range.until), accountId, campaignId: String(row.campaign?.id || "") || undefined, campaignName: row.campaign?.title, adId: String(row.creative?.id || "") || undefined, adName: row.creative?.title, currency: row.ad_account?.currency || process.env.MOLOCO_CURRENCY || "KRW", impressions: number(metric.impressions), clicks: number(metric.clicks), spend: number(metric.spend), revenue: number(metric.revenue) } satisfies AdMetricRow; });
  return { rows, status: { platform: "moloco", label: labels.moloco, configured: true, status: "live", message: `${rows.length}개 소재 일별 행`, docsUrl: docs.moloco, accountId, syncedAt: new Date().toISOString() } satisfies AdConnectionStatus };
}

export async function getPerformanceFeed(range = defaultDateRange()): Promise<PerformanceFeed> {
  const adapters = [["meta", meta], ["tiktok", tiktok], ["google-ads", googleAds], ["moloco", moloco]] as const;
  const results = await Promise.all(adapters.map(async ([platform, load]) => { try { return await load(range); } catch (error) { return { rows: [] as AdMetricRow[], status: { platform, label: labels[platform], configured: true, status: "error" as const, message: error instanceof Error ? error.message : "PROVIDER_ERROR", docsUrl: docs[platform] } }; } }));
  return { range, rows: results.flatMap((result) => result.rows), connections: results.map((result) => result.status), refreshedAt: new Date().toISOString() };
}

export function summarizePerformance(rows: AdMetricRow[]) {
  const totals = rows.reduce((sum, row) => ({ impressions: sum.impressions + row.impressions, clicks: sum.clicks + row.clicks, spend: sum.spend + row.spend, purchases: sum.purchases + (row.purchases || 0), revenue: sum.revenue + (row.revenue || 0) }), { impressions: 0, clicks: 0, spend: 0, purchases: 0, revenue: 0 });
  return { ...totals, ctr: totals.impressions ? totals.clicks / totals.impressions * 100 : null, cpc: totals.clicks ? totals.spend / totals.clicks : null, roas: totals.spend && totals.revenue ? totals.revenue / totals.spend : null };
}
