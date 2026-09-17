# Growth tool Architecture v2

## Runtime

Next.js 16 App Router를 Vercel Node.js runtime에서 실행한다. React 19 client UI는 SEED Design 토큰·컴포넌트를 사용하며 공급자 비밀값은 Route Handler 안에서만 읽는다. Supabase가 설정된 배포에서는 Auth, PostgreSQL RLS, private Storage를 사용한다.

```mermaid
flowchart TB
  UI[React + SEED UI] --> T[/api/trends]
  UI --> C[/api/creatives]
  UI --> I[/api/creative-image]
  UI --> P[/api/performance]
  T --> N[Naver DataLab]
  T --> X[X Trends API]
  T --> TK[TikTok licensed trend feed]
  C --> OR[OpenAI Responses]
  I --> OI[OpenAI Images Edit]
  P --> M[Meta Insights]
  P --> TA[TikTok Reporting]
  P --> G[Google Ads searchStream]
  P --> MO[Moloco Analytics]
  UI --> S[(Supabase)]
```

## Provider isolation

트렌드와 광고 성과 커넥터는 각각 `Promise.all`로 독립 실행한다. 어댑터는 성공 행과 연결 상태를 함께 반환한다. 한 공급자의 401, 403, 429, 5xx가 다른 공급자의 성공 결과를 제거하지 않는다.

트렌드 정규형:

```ts
type Trend = {
  id: string;
  title: string;
  category: "뷰티";
  provider: "naver-shopping" | "x" | "tiktok";
  sourceUrl: string;
  growth: number | null;
  score: number;
  values: number[];
};
```

광고 성과 정규형:

```ts
type AdMetricRow = {
  platform: "meta" | "tiktok" | "google-ads" | "moloco";
  date: string;
  accountId: string;
  campaignId?: string;
  adId?: string;
  currency: string;
  impressions: number;
  clicks: number;
  spend: number;
  purchases?: number;
  revenue?: number;
};
```

## Trend adapters

### Naver

기본 어댑터는 네이버 데이터랩 웹 화면이 사용하는 공개 일별 랭킹 요청 `POST /shoppingInsight/getKeywordRank.naver?timeUnit=date&cid=50000002`에서 화장품/미용 인기 검색어를 가져온다. 응답의 실제 순위를 10점 단위 관심도와 일별 순위 시계열로 정규화하며, 출처와 관측일을 함께 표시한다. 이 웹 엔드포인트는 변경될 수 있으므로 실패 시 가짜 데이터를 대체하지 않고 오류 상태를 노출한다.

`NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_TREND_KEYWORDS_JSON`이 모두 있으면 API HUB 어댑터를 우선한다. `POST https://naverapihub.apigw.ntruss.com/shopping/v1/category/keywords`와 `X-NCP-APIGW-API-KEY-ID`, `X-NCP-APIGW-API-KEY` 헤더를 사용한다. 기간은 14일이며 `ratio`는 절대 검색량이 아닌 요청 묶음 안의 상대 클릭 지수다.

### X

`GET https://api.x.com/2/trends/by/woeid/{woeid}`에 Bearer token을 사용한다. 응답 중 한국어 뷰티 사전과 일치하는 항목만 표시한다. `tweet_count`가 없으면 임의 성장률을 만들지 않는다.

### TikTok

Creative Center는 사용자에게 공식 출처 링크를 제공한다. 문서화된 공개 Trends API가 없으므로 `TIKTOK_TRENDS_API_URL`에 계약·승인된 JSON 공급자 URL을 넣는다. 앱은 `data[{keyword, score, growth, values, description, observedAt}]` 계약만 요구한다.

## Creative pipeline

1. 브라우저에서 JPG/PNG/WebP, 10MB 이하를 검사하고 서버에서 실제 디코딩·치수·EXIF 회전을 다시 검증한다.
2. 인증 배포에서는 signed upload ticket으로 원본을 private Storage에 올린다.
3. 서버가 Sharp로 실제 디코딩, 치수, MIME을 검증한다.
4. Responses API가 확인 사실에 제한된 A/B/C 카피를 구조화 출력한다.
5. 서버가 제품 사진을 최대 2048px 무손실 PNG로 정규화한 뒤 Images Edit의 `gpt-image-2`, `input_fidelity: high`가 정사각형 키 비주얼 한 장을 만든다.
6. 세 안은 같은 키 비주얼, 보조 문구, CTA를 공유하고 헤드라인만 다르게 한다.
7. 생성 결과를 전송 한도에 안전한 WebP로 최적화하고, 금지 표현 검토 후 Canvas가 1080×1080 PNG를 렌더링한다.

OpenAI 키가 없으면 `/api/creatives`와 `/api/creative-image`는 503을 반환한다. 서버는 데모 소재를 만들지 않는다. 심사용 배포는 8자 이상의 `JUDGE_ACCESS_CODE`를 서버에 두고 동일 코드를 `X-Judge-Access-Code` 헤더로 보낸 요청만 허용한다. 이 모드에서는 사용자 입력을 영속 저장하지 않는다.

## Performance adapters

### Meta

Graph API 광고 계정 Insights를 `level=ad`, `time_increment=1`로 조회한다. `actions`와 `action_values`에서 purchase 계열 action type을 찾는다.

### TikTok Ads

Marketing API v1.3 `report/integrated/get`을 `AUCTION_AD` 수준과 `stat_time_day` 차원으로 조회한다. `Access-Token`은 서버 헤더에만 둔다.

### Google Ads

OAuth refresh token으로 access token을 발급하고 Google Ads REST v25 `googleAds:searchStream`을 호출한다. 비용의 `cost_micros`는 1,000,000으로 나눈다.

### Moloco

읽기 전용 API key를 `/cm/v1/auth/tokens`에 보내 16시간 token을 받고 `/cm/v1/analytics-detail`을 조회한다. 날짜·캠페인·소재 차원과 impressions/clicks/spend/revenue 지표를 요청한다.

## Aggregation rules

- CTR = clicks / impressions × 100
- CPC = spend / clicks
- ROAS = revenue / spend
- 분모가 0이면 null이다.
- 통화가 둘 이상이면 합산 KPI는 null이며 플랫폼 원본 행만 표시한다.
- 귀속 기간과 conversion event가 다른 데이터는 장기 저장 단계에서 별도 `settings_hash`로 구분해야 한다.

## Security

- API key, access token, refresh token에는 `NEXT_PUBLIC_`을 쓰지 않는다.
- `/api/health`는 설정 여부 boolean만 노출한다.
- 업로드 경로는 `{workspace_id}/...`로 제한하고 DB 행과 Storage 모두 RLS를 적용한다.
- OpenAI text 요청은 `store:false`다.
- PoC는 서버 환경변수 기반 단일 계정 연결이다. 다중 고객 OAuth는 token envelope encryption, 회전, revoke webhook, 앱 심사를 구현한 다음 도입한다.
- 광고 연동은 읽기 전용이다.

## Reliability

- 외부 조회는 `cache:no-store`다.
- UI는 `live`, `unconfigured`, `error`를 분리한다.
- 429는 재시도 시 jittered exponential backoff와 공급자별 rate limit을 적용할 후속 작업이다.
- Moloco Report API처럼 비동기 생성이 필요한 대용량 기간은 백그라운드 job으로 분리한다. MVP 화면은 Analytics API의 최대 10,000행 범위만 사용한다.

## Verification

필수 CI: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`.

심사용 MVP 출시 전에는 fixture 테스트 외에 실제 계정으로 다음을 확인한다.

1. Naver 또는 X 실트렌드 한 건 이상.
2. 실제 제품 사진의 OpenAI Images Edit 성공과 패키지 보존 검수.
3. 체험 코드가 없는 AI 요청의 거부와 외부 브라우저에서 PNG/ZIP 다운로드.

광고 플랫폼 실제 일별 행, 잘못된 token, 만료 token, 권한 부족, 0행, 다른 통화 상태는 심사용 MVP 이후 검증한다.
