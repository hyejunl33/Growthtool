# Growth tool 배포 기록

## 공개 데모

- URL: https://growthtool.vercel.app
- 공급자: Vercel, `icn1`
- 소스: `hyejunl33/Growthtool`의 `main`
- 배포 커밋: GitHub `main` 최신 커밋(자동 배포)
- 상태 API: https://growthtool.vercel.app/api/health

초기 데모 배포 뒤 2026-09-17에 제품 범위를 뷰티로 한정하고 실데이터 연결 구조로 교체했다. 로컬에서 TypeScript, ESLint, Vitest, production build, Playwright를 통과한 뒤 `main` 자동 배포와 외부 URL을 다시 검증한다.

외부 연동 키가 없는 배포도 네이버 데이터랩의 공개 화장품/미용 일별 랭킹을 실시간으로 읽는다. 예시 트렌드·결정론적 카피·가짜 성과는 제공하지 않는다. 다음 환경변수와 Supabase 마이그레이션을 운영 프로젝트에 적용하면 API HUB 상세 클릭지수와 계정 기능을 추가로 사용할 수 있다.

심사용 MVP는 `JUDGE_ACCESS_CODE`를 설정하면 Supabase 계정 없이도 체험 코드를 가진 심사관이 실제 OpenAI 카피·이미지 생성을 실행할 수 있다. 코드는 8자 이상의 임의 문자열로 만들고 심사 종료 후 교체하거나 제거한다. 공개 상태 API의 `launchReady`는 체험 접근, 실제 트렌드 공급자 1개 이상, OpenAI 이미지 생성이 모두 설정될 때만 `true`가 된다. 광고 성과 연동은 이번 심사용 출시 게이트에서 제외한다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `OPENAI_IMAGE_MODEL`
- `JUDGE_ACCESS_CODE` (심사용 게스트 체험을 사용할 때)
- `PHOTOROOM_API_KEY`
- `NAVER_PUBLIC_RANKING_ENABLED` (기본 `true`, 공개 화장품/미용 일별 랭킹을 끌 때만 `false`)
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_TREND_KEYWORDS_JSON` (NAVER API HUB 발급값)
- `X_BEARER_TOKEN`, `X_TRENDS_WOEID`
- `TIKTOK_TRENDS_API_URL`, `TIKTOK_TRENDS_API_TOKEN`
- `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`
- `TIKTOK_ADS_ACCESS_TOKEN`, `TIKTOK_ADVERTISER_ID`
- `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`
- `MOLOCO_API_KEY`, `MOLOCO_AD_ACCOUNT_ID`
- `NEXT_PUBLIC_APP_URL=https://growthtool.vercel.app`

운영 전에는 Supabase Auth의 Site URL과 Redirect URLs에 `https://growthtool.vercel.app` 및 `/auth/callback`을 등록한다. `supabase/migrations`의 세 파일을 순서대로 적용하고, 서로 다른 두 계정으로 RLS와 비공개 Storage 교차 접근 거부를 확인한다.
