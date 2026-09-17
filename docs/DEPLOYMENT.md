# Growth tool 배포 기록

## 공개 데모

- URL: https://growthtool.vercel.app
- 공급자: Vercel, `icn1`
- 소스: `hyejunl33/Growthtool`의 `main`
- 배포 커밋: GitHub `main` 최신 커밋(자동 배포)
- 상태 API: https://growthtool.vercel.app/api/health

초기 데모 배포 뒤 2026-09-17에 제품 범위를 뷰티로 한정하고 실데이터 연결 구조로 교체했다. 로컬에서 TypeScript, ESLint, Vitest, production build, Playwright를 통과한 뒤 `main` 자동 배포와 외부 URL을 다시 검증한다.

외부 연동 키가 없는 배포는 `credential-setup` 모드다. 예시 트렌드·결정론적 카피·가짜 성과를 제공하지 않는다. 다음 환경변수와 Supabase 마이그레이션을 운영 프로젝트에 적용한 뒤 실제 계정 smoke를 기록해야 한다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `OPENAI_IMAGE_MODEL`
- `PHOTOROOM_API_KEY`
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_TREND_KEYWORDS_JSON`
- `X_BEARER_TOKEN`, `X_TRENDS_WOEID`
- `TIKTOK_TRENDS_API_URL`, `TIKTOK_TRENDS_API_TOKEN`
- `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`
- `TIKTOK_ADS_ACCESS_TOKEN`, `TIKTOK_ADVERTISER_ID`
- `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`
- `MOLOCO_API_KEY`, `MOLOCO_AD_ACCOUNT_ID`
- `NEXT_PUBLIC_APP_URL=https://growthtool.vercel.app`

운영 전에는 Supabase Auth의 Site URL과 Redirect URLs에 `https://growthtool.vercel.app` 및 `/auth/callback`을 등록한다. `supabase/migrations`의 세 파일을 순서대로 적용하고, 서로 다른 두 계정으로 RLS와 비공개 Storage 교차 접근 거부를 확인한다.
