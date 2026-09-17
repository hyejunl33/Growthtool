export type TrendProvider = "naver-shopping" | "x" | "tiktok";

export type Trend = {
  id: string;
  title: string;
  category: "뷰티";
  provider: TrendProvider;
  sourceUrl: string;
  growth: number | null;
  score: number;
  description: string;
  color: string;
  values: number[];
};

export type ProviderStatus = {
  provider: TrendProvider;
  label: string;
  configured: boolean;
  status: "live" | "unconfigured" | "error";
  message: string;
  sourceUrl: string;
  observedAt?: string;
};

export type TrendFeed = {
  configured: boolean;
  refreshedAt: string;
  freshness: "fresh" | "delayed" | "expired" | "unavailable";
  message: string;
  providers: ProviderStatus[];
  trends: Trend[];
};

type NaverKeyword = { name: string; param: string[]; description?: string };
type NaverResponse = { results?: Array<{ title: string; data: Array<{ period: string; ratio: number }> }> };

const colors = ["#FFE4D6", "#E7E1FF", "#F4E3C1", "#D9F2E6", "#FFE0EC"];
const beautyTerms = ["뷰티", "화장", "스킨", "크림", "세럼", "앰플", "토너", "클렌", "선크림", "립", "쿠션", "파운데이션", "마스카라", "향수", "헤어", "네일", "피부", "메이크업"];

export function classifyTrendFreshness(observedAt?: string, now = new Date()) {
  if (!observedAt) return "unavailable" as const;
  const observed = new Date(observedAt.length === 10 ? `${observedAt}T00:00:00+09:00` : observedAt);
  const age = Math.floor((now.getTime() - observed.getTime()) / 86_400_000);
  if (Number.isNaN(observed.getTime()) || age > 7) return "expired" as const;
  if (age >= 3) return "delayed" as const;
  return "fresh" as const;
}

function configuredKeywords(): NaverKeyword[] {
  try {
    const parsed = JSON.parse(process.env.NAVER_TREND_KEYWORDS_JSON || "[]") as NaverKeyword[];
    return parsed.filter((item) => item.name && Array.isArray(item.param) && item.param.length > 0);
  } catch { return []; }
}

function period(days: number) {
  const end = new Date(); const start = new Date(end); start.setDate(end.getDate() - days);
  const format = (value: Date) => value.toISOString().slice(0, 10);
  return { startDate: format(start), endDate: format(end) };
}

function percentageChange(values: number[]) {
  if (values.length < 2) return 0;
  const pivot = values[Math.max(0, values.length - 4)] || 0; const latest = values.at(-1) || 0;
  if (pivot === 0) return latest > 0 ? 100 : 0;
  return Math.round(((latest - pivot) / pivot) * 100);
}

async function naverTrends(): Promise<{ trends: Trend[]; status: ProviderStatus }> {
  const clientId = process.env.NAVER_CLIENT_ID; const clientSecret = process.env.NAVER_CLIENT_SECRET; const keywords = configuredKeywords().slice(0, 5);
  const sourceUrl = "https://datalab.naver.com/shoppingInsight/sCategory.naver";
  if (!clientId || !clientSecret || keywords.length === 0) return { trends: [], status: { provider: "naver-shopping", label: "네이버 쇼핑", configured: false, status: "unconfigured", message: "Client ID·Secret과 뷰티 키워드가 필요해요.", sourceUrl } };
  const response = await fetch("https://naverapihub.apigw.ntruss.com/shopping/v1/category/keywords", { method: "POST", headers: { "Content-Type": "application/json", "X-NCP-APIGW-API-KEY-ID": clientId, "X-NCP-APIGW-API-KEY": clientSecret }, body: JSON.stringify({ ...period(14), timeUnit: "date", category: process.env.NAVER_SHOPPING_CATEGORY || "50000002", keyword: keywords.map(({ name, param }) => ({ name, param })) }), cache: "no-store" });
  if (!response.ok) throw new Error(`NAVER_${response.status}`);
  const payload = await response.json() as NaverResponse;
  const observedAt = (payload.results || []).flatMap((result) => result.data.map((item) => item.period)).sort().at(-1);
  const trends = (payload.results || []).map((result, index) => { const values = result.data.map((item) => item.ratio); const keyword = keywords.find((item) => item.name === result.title); return { id: `naver-${result.title}`, title: result.title, category: "뷰티", provider: "naver-shopping", sourceUrl, growth: percentageChange(values), score: Math.min(99, Math.max(1, Math.round(values.at(-1) || 0))), description: keyword?.description || "네이버 쇼핑의 최근 14일 상대 클릭 추이예요.", color: colors[index % colors.length], values } satisfies Trend; });
  return { trends, status: { provider: "naver-shopping", label: "네이버 쇼핑", configured: true, status: "live", message: `${trends.length}개 키워드 실측`, sourceUrl, observedAt } };
}

async function xTrends(): Promise<{ trends: Trend[]; status: ProviderStatus }> {
  const token = process.env.X_BEARER_TOKEN; const woeid = process.env.X_TRENDS_WOEID || "23424868"; const sourceUrl = "https://x.com/explore/tabs/trending";
  if (!token) return { trends: [], status: { provider: "x", label: "X 트렌드", configured: false, status: "unconfigured", message: "X API Bearer Token이 필요해요.", sourceUrl } };
  const response = await fetch(`https://api.x.com/2/trends/by/woeid/${encodeURIComponent(woeid)}?max_trends=50`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`X_${response.status}`);
  const payload = await response.json() as { data?: Array<{ trend_name?: string; tweet_count?: number }> };
  const rows = (payload.data || []).filter((row) => row.trend_name && beautyTerms.some((term) => row.trend_name!.toLowerCase().includes(term))).slice(0, 10);
  const maxCount = Math.max(...rows.map((row) => row.tweet_count || 0), 1);
  const trends = rows.map((row, index) => ({ id: `x-${row.trend_name}`, title: row.trend_name!, category: "뷰티", provider: "x", sourceUrl, growth: null, score: row.tweet_count ? Math.round((row.tweet_count / maxCount) * 100) : Math.max(50, 90 - index * 4), description: row.tweet_count ? `X 공개 트렌드 · 게시물 약 ${row.tweet_count.toLocaleString("ko-KR")}건` : "X 한국 지역의 실시간 뷰티 관련 트렌드예요.", color: colors[(index + 1) % colors.length], values: [] })) satisfies Trend[];
  return { trends, status: { provider: "x", label: "X 트렌드", configured: true, status: "live", message: trends.length ? `${trends.length}개 뷰티 키워드 실측` : "현재 뷰티 일치 키워드가 없어요.", sourceUrl, observedAt: new Date().toISOString() } };
}

type ExternalTrendRow = { keyword?: string; title?: string; score?: number; growth?: number; values?: number[]; description?: string; observedAt?: string };
async function tiktokTrends(): Promise<{ trends: Trend[]; status: ProviderStatus }> {
  const endpoint = process.env.TIKTOK_TRENDS_API_URL; const token = process.env.TIKTOK_TRENDS_API_TOKEN; const sourceUrl = "https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en";
  if (!endpoint) return { trends: [], status: { provider: "tiktok", label: "TikTok Creative Center", configured: false, status: "unconfigured", message: "승인된 트렌드 피드 URL이 필요해요.", sourceUrl } };
  const response = await fetch(endpoint, { headers: token ? { Authorization: `Bearer ${token}` } : undefined, cache: "no-store" });
  if (!response.ok) throw new Error(`TIKTOK_${response.status}`);
  const body = await response.json() as { data?: ExternalTrendRow[] } | ExternalTrendRow[]; const rows = Array.isArray(body) ? body : body.data || [];
  const trends = rows.slice(0, 10).flatMap((row, index) => { const title = row.keyword || row.title; if (!title) return []; return [{ id: `tiktok-${title}`, title, category: "뷰티", provider: "tiktok", sourceUrl, growth: typeof row.growth === "number" ? row.growth : null, score: Math.min(100, Math.max(1, Math.round(row.score || 70))), description: row.description || "TikTok Creative Center 기반 뷰티 트렌드예요.", color: colors[(index + 2) % colors.length], values: Array.isArray(row.values) ? row.values.map(Number).filter(Number.isFinite) : [] } satisfies Trend]; });
  return { trends, status: { provider: "tiktok", label: "TikTok Creative Center", configured: true, status: "live", message: `${trends.length}개 키워드 실측`, sourceUrl, observedAt: rows[0]?.observedAt || new Date().toISOString() } };
}

export async function getTrendFeed(): Promise<TrendFeed> {
  const providers = [["naver-shopping", "네이버 쇼핑", naverTrends], ["x", "X 트렌드", xTrends], ["tiktok", "TikTok Creative Center", tiktokTrends]] as const;
  const results = await Promise.all(providers.map(async ([provider, label, load]) => { try { return await load(); } catch (error) { return { trends: [] as Trend[], status: { provider, label, configured: true, status: "error" as const, message: error instanceof Error ? error.message : "PROVIDER_ERROR", sourceUrl: provider === "x" ? "https://x.com/explore/tabs/trending" : provider === "tiktok" ? "https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en" : "https://datalab.naver.com/shoppingInsight/sCategory.naver" } }; } }));
  const trends = results.flatMap((result) => result.trends).sort((a, b) => b.score - a.score).slice(0, 20);
  const observedAt = results.flatMap((result) => result.status.observedAt ? [result.status.observedAt] : []).sort().at(-1);
  return { configured: results.some((result) => result.status.configured), refreshedAt: new Date().toISOString(), freshness: trends.length ? classifyTrendFreshness(observedAt || new Date().toISOString()) : "unavailable", message: trends.length ? `${results.filter((result) => result.status.status === "live").length}개 실데이터 소스에서 뷰티 트렌드를 가져왔어요.` : "연결된 트렌드 소스에 실데이터가 없습니다. API 연결 상태를 확인하세요.", providers: results.map((result) => result.status), trends };
}
