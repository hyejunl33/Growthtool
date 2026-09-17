export type Trend = {
  id: string;
  title: string;
  category: string;
  growth: number;
  score: number;
  description: string;
  color: string;
  values: number[];
};

export type TrendFeed = {
  provider: "demo" | "naver-shopping";
  configured: boolean;
  refreshedAt: string;
  observedAt?: string;
  freshness: "demo" | "fresh" | "delayed" | "expired";
  message?: string;
  trends: Trend[];
};

export function classifyTrendFreshness(observedAt?: string, now = new Date()) {
  if (!observedAt) return "demo" as const;
  const observed = new Date(`${observedAt}T00:00:00+09:00`);
  const age = Math.floor((now.getTime() - observed.getTime()) / 86_400_000);
  if (Number.isNaN(observed.getTime()) || age > 7) return "expired" as const;
  if (age >= 3) return "delayed" as const;
  return "fresh" as const;
}

export const demoTrends: Trend[] = [
  { id: "t1", title: "가을 출근룩", category: "패션의류", growth: 43, score: 94, description: "간절기 레이어드와 출근 코디 탐색이 함께 늘고 있어요.", color: "#FFE4D6", values: [28, 31, 26, 36, 39, 53, 67] },
  { id: "t2", title: "글로우 베이스", category: "화장품/미용", growth: 28, score: 87, description: "건조한 계절 전환기에 광채·보습 베이스 관심이 높아졌어요.", color: "#E7E1FF", values: [32, 34, 37, 39, 48, 55, 60] },
  { id: "t3", title: "스웨이드 재킷", category: "패션의류", growth: 21, score: 82, description: "소재 중심의 검색 신호가 이어지고 있어요.", color: "#F4E3C1", values: [40, 41, 45, 46, 49, 54, 57] },
  { id: "t4", title: "저자극 클렌징", category: "화장품/미용", growth: 16, score: 77, description: "민감 피부 루틴을 찾는 신호예요. 효능 표현은 확인이 필요해요.", color: "#D9F2E6", values: [38, 37, 42, 43, 44, 48, 51] },
];

type NaverKeyword = { name: string; param: string[]; description?: string };
type NaverResponse = { results?: Array<{ title: string; data: Array<{ period: string; ratio: number }> }> };

function configuredKeywords(): NaverKeyword[] {
  try {
    const parsed = JSON.parse(process.env.NAVER_TREND_KEYWORDS_JSON || "[]") as NaverKeyword[];
    return parsed.filter((item) => item.name && Array.isArray(item.param) && item.param.length > 0);
  } catch {
    return [];
  }
}

function period(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - days);
  const format = (value: Date) => value.toISOString().slice(0, 10);
  return { startDate: format(start), endDate: format(end) };
}

function percentageChange(values: number[]) {
  if (values.length < 2) return 0;
  const pivot = values[Math.max(0, values.length - 4)] || 0;
  const latest = values.at(-1) || 0;
  if (pivot === 0) return latest > 0 ? 100 : 0;
  return Math.round(((latest - pivot) / pivot) * 100);
}

export async function getTrendFeed(): Promise<TrendFeed> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const keywords = configuredKeywords().slice(0, 5);

  if (!clientId || !clientSecret || keywords.length === 0) {
    return {
      provider: "demo",
      configured: false,
      refreshedAt: new Date().toISOString(),
      freshness: "demo",
      message: "NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_TREND_KEYWORDS_JSON을 설정하면 네이버 쇼핑 인사이트를 불러옵니다.",
      trends: demoTrends,
    };
  }

  const response = await fetch("https://openapi.naver.com/v1/datalab/shopping/category/keywords", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    body: JSON.stringify({
      ...period(14),
      timeUnit: "date",
      category: process.env.NAVER_SHOPPING_CATEGORY || "50000000",
      keyword: keywords.map(({ name, param }) => ({ name, param })),
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`NAVER_API_${response.status}`);
  const payload = await response.json() as NaverResponse;
  const category = process.env.NAVER_TREND_CATEGORY_LABEL || "네이버 쇼핑";
  const trends = (payload.results || []).map((result, index) => {
    const values = result.data.map((item) => item.ratio);
    const keyword = keywords.find((item) => item.name === result.title);
    const growth = percentageChange(values);
    return {
      id: `naver-${index}-${result.title}`,
      title: result.title,
      category,
      growth,
      score: Math.min(99, Math.max(1, Math.round((values.at(-1) || 0)))),
      description: keyword?.description || "네이버 쇼핑 인사이트의 상대 클릭 추이를 반영했어요.",
      color: ["#FFE4D6", "#E7E1FF", "#F4E3C1", "#D9F2E6"][index % 4],
      values,
    } satisfies Trend;
  });

  return {
    provider: "naver-shopping",
    configured: true,
    refreshedAt: new Date().toISOString(),
    observedAt: (payload.results || []).flatMap((result) => result.data.map((item) => item.period)).sort().at(-1),
    freshness: classifyTrendFreshness((payload.results || []).flatMap((result) => result.data.map((item) => item.period)).sort().at(-1)),
    trends: trends.length > 0 ? trends : demoTrends,
  };
}
