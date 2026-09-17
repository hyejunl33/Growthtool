# Growth tool — Beauty Live MVP

뷰티 셀러를 위한 실시간 트렌드·AI 광고 소재·광고 성과 통합 서비스입니다.

- [PRD](docs/PRD.md): 고객, 범위, 사용자 흐름, 요구사항, 수용 기준, 사업 검증, 일정
- [기술 설계](docs/ARCHITECTURE.md): 기술스택, 시스템 구성, 데이터 모델, API, 생성·수집 파이프라인
- [개발 이슈](docs/BACKLOG.md): 우선순위, 의존성, 예상 공수, 이슈별 완료 조건
- [조사 근거와 외부 의존성](docs/RESEARCH.md): 공식 출처, 확인된 사실, 검증이 필요한 조건

작성 기준: 2026-09-17 / 1인 개발 / 6~8주. 공개 데모는 [growthtool.vercel.app](https://growthtool.vercel.app)에서 테스트할 수 있습니다. 배포 모드와 확인 범위는 [배포 기록](docs/DEPLOYMENT.md)을 참고하세요.

## 실행과 외부 API 연결

`cp .env.example .env.local` 후 필요한 공급자 자격증명을 입력합니다. 키가 비어 있으면 샘플 수치를 만들지 않고 화면에 `연결 필요` 상태를 표시합니다. 모든 비밀값은 서버 Route Handler에서만 사용하며 `NEXT_PUBLIC_` 접두어를 쓰지 않습니다.

```bash
pnpm install
pnpm dev
```

- 트렌드: Naver Shopping Insight, X Trends, 승인된 TikTok trend feed
- AI 소재: OpenAI Responses + Images Edit, 선택적 Photoroom
- 성과: Meta Ads, TikTok Ads, Google Ads, Moloco 읽기 API

환경변수 전체 계약은 [.env.example](.env.example), 실제 연결 조건은 [PRD](docs/PRD.md)의 외부 의존성 표를 참고하세요.

연결 저장소: [hyejunl33/Growthtool](https://github.com/hyejunl33/Growthtool). GitHub CLI는 시스템 키링으로 인증했으며 PR #25가 main에 반영되었습니다. PRD 백로그는 GitHub Issues #1–#24로 발행했습니다.

권장 개발 순서: 환경변수 연결 → 실트렌드 확인 → 제품 사진 기반 AI 생성 → 광고 계정 성과 대조 → 비공개 PoC.

문서 충돌 시 제품 범위·성공 기준은 PRD, 구현 계약은 ARCHITECTURE를 기준으로 하며 함께 수정합니다. 이후 범위 변경은 PRD 버전과 관련 이슈에 기록합니다.
