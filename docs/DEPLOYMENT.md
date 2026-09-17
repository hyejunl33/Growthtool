# Growth tool 배포 기록

## 공개 데모

- URL: https://growthtool.vercel.app
- 공급자: Vercel, `icn1`
- 소스: `hyejunl33/Growthtool`의 `main`
- 배포 커밋: `51e0d7ada9b60ab4002ee62d5ed680b6fda9630a`
- 상태 API: https://growthtool.vercel.app/api/health

2026-09-17 배포 직후 외부 HTTPS URL을 대상으로 Playwright Chromium 테스트를 실행했다. 트렌드 대시보드 진입, 스튜디오 이동, 카피 3안 생성, 편집 후 금지 문구 차단, 상태 API의 비밀값 비노출을 확인했으며 2개 테스트가 통과했다.

현재 공개 주소는 외부 연동 키가 없는 `demo` 모드다. 예시 트렌드와 결정적 카피 폴백으로 핵심 UX를 테스트할 수 있고, 사용자가 올린 사진은 브라우저 메모리에서 미리보기와 내보내기에 사용된다. 다음 환경변수와 Supabase 마이그레이션을 운영 프로젝트에 적용한 뒤 `private-beta` 모드의 인증·저장·실데이터 smoke를 다시 기록해야 한다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`
- `PHOTOROOM_API_KEY`
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_TREND_KEYWORDS_JSON`
- `NEXT_PUBLIC_APP_URL=https://growthtool.vercel.app`

운영 전에는 Supabase Auth의 Site URL과 Redirect URLs에 `https://growthtool.vercel.app` 및 `/auth/callback`을 등록한다. `supabase/migrations`의 세 파일을 순서대로 적용하고, 서로 다른 두 계정으로 RLS와 비공개 Storage 교차 접근 거부를 확인한다.
