# Growth tool — GitHub 저장소·이슈 연결 상태

저장소: [hyejunl33/Growthtool](https://github.com/hyejunl33/Growthtool)

2026-09-17 GitHub 연결을 통해 첫 이슈 등록을 시도했으나 `403 Resource not accessible by integration` 응답으로 등록되지 않았다. 원격 이슈가 생성된 것으로 간주하지 않는다. 개발 작업 24개의 제목·의존성·공수·완료 조건은 [BACKLOG](BACKLOG.md), 구조화 원본은 [issues.json](issues.json)에 모두 준비되어 있다.

## 저장소 상태

- 로컬 remote `origin`: `https://github.com/hyejunl33/Growthtool.git`
- 로컬 작업 브랜치: `codex/prd-mvp-plan`
- 원격 조사 당시: 빈 저장소, 기본 브랜치 설정 `main`, 기존 코드·작업 규칙 없음.
- 로컬 문서는 커밋 완료. Git push는 HTTPS 인증 정보가 없어 실패했고, GitHub 연결의 Contents API 파일 생성도 `403 Resource not accessible by integration`으로 거절됐다.
- 따라서 원격 문서 업로드·PR·이슈 등록은 완료되지 않았다. 이 오류는 자동 승인 리뷰의 거절이 아니라 GitHub 인증·연결 권한 오류다.

GitHub 연결에서 이 저장소의 Contents 및 Issues 쓰기가 가능하도록 접근을 갱신하거나 로컬 Git 인증을 제공한 후 이어서 진행한다. 토큰을 문서·이슈·대화에 붙여 넣지 않는다. 재개 시 원격 변경과 기존 이슈를 다시 조회하고, 빈 저장소 여부에 맞춰 브랜치와 PR 구성을 결정한다.

## 이슈 등록

연결에 Issues 쓰기 권한이 제공된 뒤 기존 이슈를 먼저 검색하고, `[P0][Txx]` ID를 기준으로 중복 없이 등록한다. 등록 결과는 아래 표에 추가한다. 원격 이슈 번호를 문서 ID와 동일하다고 가정하지 않는다.

`scripts/publish-github-issues.mjs`가 구조화된 `docs/issues.json`을 읽어 위 기준으로 처리한다. 기본 실행은 dry run이며, 셸에서만 설정한 `GITHUB_TOKEN`으로 `pnpm issues:publish -- --publish`를 실행할 때만 GitHub 이슈를 만든다. 토큰에는 해당 저장소의 Issues 읽기·쓰기 권한이 필요하다.

| 문서 ID | GitHub 이슈 | 등록 상태 |
|---|---|---|
| T01~T24 | 미등록 | 연결의 Issues 쓰기 권한 확인 필요 |
