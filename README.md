# Growth tool — MVP 기획 문서

패션·뷰티 셀러를 위한 트렌드 기반 광고 소재 제작 서비스의 개발 기준 문서입니다. 프로젝트 이름은 Growth tool입니다.

- [PRD](docs/PRD.md): 고객, 범위, 사용자 흐름, 요구사항, 수용 기준, 사업 검증, 일정
- [기술 설계](docs/ARCHITECTURE.md): 기술스택, 시스템 구성, 데이터 모델, API, 생성·수집 파이프라인
- [개발 이슈](docs/BACKLOG.md): 우선순위, 의존성, 예상 공수, 이슈별 완료 조건
- [조사 근거와 외부 의존성](docs/RESEARCH.md): 공식 출처, 확인된 사실, 검증이 필요한 조건

작성 기준: 2026-09-17 / 1인 개발 / 6~8주. 현재 산출물은 기획·설계이며 애플리케이션과 외부 GitHub 이슈는 아직 생성하지 않았습니다.

연결 저장소: [hyejunl33/Growthtool](https://github.com/hyejunl33/Growthtool). 로컬 `origin`과 `codex/prd-mvp-plan` 브랜치는 설정했습니다. 현재 GitHub 연결의 쓰기 권한 오류로 문서 업로드·원격 이슈 등록은 완료되지 않았습니다. 상세 상태는 [GitHub 연결 상태](docs/GITHUB_ISSUES.md)를 참고하세요.

권장 개발 순서: PRD 범위 확인 → T01 기술 검증 → T02~T04 기반 → 제품 등록부터 다운로드까지 한 번 완주 → 트렌드·성과 비교 연결 → 비공개 PoC.

문서 충돌 시 제품 범위·성공 기준은 PRD, 구현 계약은 ARCHITECTURE를 기준으로 하며 함께 수정합니다. 이후 범위 변경은 PRD 버전과 관련 이슈에 기록합니다.
