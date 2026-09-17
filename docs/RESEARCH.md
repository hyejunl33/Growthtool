# Growth tool — 조사 근거와 의존성 검증

확인일: 2026-09-17. 공식 문서의 공개 내용과 이번 조사에서 확인되지 않은 사항을 구분한다. 외부 계정의 실제 권한·유료 호출·상업적 데이터 이용 조건을 검증한 결과는 아니다. API 버전·가격·약관은 개발 시작 시 다시 확인한다.

## 1. 제품 설계에 영향을 준 확인 결과

| ID | 공식 출처 | 확인한 내용 | 설계 반영 |
|---|---|---|---|
| R01 | [네이버 쇼핑인사이트 API](https://developers.naver.com/docs/serviceapi/datalab/shopping/shopping.md) | 키워드 입력을 받아 일/주/월별 클릭 상대값 반환. 키워드 쌍 최대 5개, param은 1개 | 후보 키워드 관리 필요, 실시간 전체 급상승 목록으로 설명하지 않음 |
| R02 | [네이버 API별 호출 한도](https://developers.naver.com/products/intro/plan/plan.md) | 쇼핑인사이트 기본 일 1,000회 | 서비스 공용 쿼터·배치·캐시 |
| R03 | [네이버 데이터랩 고객센터](https://help.naver.com/service/17528/contents/17069?lang=ko&osType=COMMONOS) | 웹 서비스는 분야 통계·인기 검색어·검색어 통계 제공 | 웹 화면 기능과 공개 API 기능을 구분 |
| R04 | [Meta 광고 라이브러리 API](https://www.facebook.com/ads/library/api/) | 검색 결과에 노출된 공식 설명은 정치·사회 이슈 광고와 UK/EU 등 광고 범위·공개 필드를 명시. 일반 한국 경쟁사의 구매 ROAS 제공 근거는 없음 | 국내 경쟁사 자동 수집·‘고ROAS’ 표시를 P0에서 제외 |
| R05 | [TikTok Top Ads 사용법](https://ads.tiktok.com/resources/help/article/how-to-use-the-top-ads-dashboard?lang=es-419) | CTR 등 정렬과 상대 성과 그래프가 있는 Top Ads UI | ‘공개 성과 관련 정보가 전혀 없다’고 단정하지 않음. 수집·재사용 계약은 별개 |
| R06 | [TikTok Top Ads 공식 설명](https://ads.tiktok.com/business/library/NA_Creative_Center_Top_Ads_One_Pager.pdf) | 광고주의 노출 허가 및 성과 기준을 충족한 광고 모음 | 전체 광고의 무작위 대표 표본으로 해석하지 않음 |
| R07 | [X 지역 트렌드 API](https://docs.x.com/x-api/trends/get-trends-by-woeid), [X API 소개](https://docs.x.com/x-api/introduction) | WOEID 지역 트렌드 엔드포인트, 사용량 기반 가격 구조 안내 | API 부재라고 단정하지 않되 비용·계정 권한 검증 전 미연동 |
| R08 | [Signal.bz](https://signal.bz/), [나무위키](https://namu.wiki/) | 본 조사에서 재사용 가능한 공식 상업 API·수집 허가 확인 못함. 페이지 내용도 도구로 충분히 열람되지 않음 | ‘불법’이나 ‘API가 절대 없다’는 결론이 아님. 연결 비활성 기본값 |
| R09 | [GPT-4.1 mini 모델](https://developers.openai.com/api/docs/models/gpt-4.1-mini) | 이미지 입력, Responses, 구조화 출력과 snapshot 안내 | 분석·카피 기준 모델로 선택, 모델 어댑터와 평가셋 |
| R10 | [GPT Image 1.5](https://developers.openai.com/api/docs/models/gpt-image-1.5) | 이미지 생성 모델, medium 1024×1024 출력 가격 $0.034 안내 | 배경 생성 기준 비용. 제품·한글 레이어는 자체 합성 |
| R11 | [Photoroom Quickstart](https://docs.photoroom.com/remove-background-api-basic-plan/quickstart-guide), [API 가격](https://www.photoroom.com/api/pricing) | 배경 제거 API, Basic 호출당 $0.02 안내 | 누끼 공급자 선택, 약정·쿼터·품질은 실제 계정에서 검증 |
| R12 | [Next.js 16](https://nextjs.org/blog/next-16), [지원 정책](https://nextjs.org/support-policy) | 16 계열 공식 릴리스·지원 정보 | 보안 패치 적용된 16.x를 lockfile로 고정 |
| R13 | [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [파일 다운로드](https://supabase.com/docs/guides/storage/serving/downloads) | RLS와 private 파일·서명 URL | 테넌트·파일 접근 통제, 서명 URL 짧은 유효기간 |
| R14 | [Trigger.dev idempotency](https://trigger.dev/docs/idempotency), [일정](https://trigger.dev/docs/tasks/scheduled), [Playwright](https://trigger.dev/docs/config/extensions/playwright) | 작업 중복 키, cron, 브라우저 확장 | Airflow 없이 작업 운영, DB 자체 중복 방지도 추가 |
| R15 | [React Konva](https://konvajs.org/docs/react/index.html) | React 기반 Canvas 객체 렌더링 | 제한 편집기 및 같은 scene의 서버 렌더링 |

Meta 공식 문서 일부는 직접 열람 오류가 있었다. R04는 공식 도메인 검색 결과에 표시된 내용을 확인한 것이며, 지역별 최신 전체 API 계약을 인증 계정에서 끝까지 점검한 것은 아니다. Marketing API의 insights·authorization 페이지도 직접 열람이 실패했으므로 P1의 권한 scope·Graph 버전·심사 조건은 아직 확정하지 않았다. 이를 P0 필수 의존성에서 제외한다.

## 2. 개발 전 검증할 의존성

| 검증 | 산출물 | 실패 시 대안·게이트 |
|---|---|---|
| 네이버 계정·카테고리 코드·응답 지연 | 실제 응답의 비밀값 제거 fixture, quota·관측일·조건 확인 기록 | 개발은 mock으로 진행 가능. 외부 트렌드 제품 출시 전 실제 연동 또는 명시적 범위 변경 필요 |
| 공급자 데이터 저장·노출 조건 | 데이터 소스별 사용 범위·보존·출처 표기 기록 | 허용 범위를 넘는 캐싱·재배포 비활성화, 제휴 검토 |
| OpenAI 모델 접근·비용·품질 | 실제 사진 3개 smoke, 20상품 평가 계획, 요청 ID·실제 비용 | 동일 인터페이스 공급자 변경 또는 AI 범위 조정 기록 |
| Photoroom의 반사·투명·복수 제품 누끼 | 제품 보존 품질·원가 기록 | 원본 카드형 구도로 완료 |
| Trigger Chromium·폰트 번들 | 한국어 텍스트·사진 포함 PNG 1장, 크기·시간·메모리 | 분리된 Node 컨테이너 renderer로 변경 가능; T01 안에 선택 |
| URL 가져오기 | 허용 도메인별 권한·성공률·SSRF 검증 | 수동 사진·설명 입력으로 MVP 유지 |
| 전환 매출 추적 가능성 | 셀러별 보유 보고서·구매 금액 필드·귀속 설정 점검 | 제작 시간·CTR/CPC 코호트로 분리, ROAS 미표시 |
| 운영 예산·메일·백업 | 실제 플랜 견적, 인증 메일, DB+자산 복원 기록 | 초대 규모 조절, 공급자 플랜 변경 |

## 3. 해석상 주의할 제품 주장

- 높은 공개 관심도는 구매 의도·수익성의 증거가 아니다.
- 장기간 노출된 광고는 실험 후보를 고르는 힌트일 수 있으나 CTR·ROAS가 좋다는 증거가 아니다.
- 경쟁사 구도를 분석하는 능력과 해당 소재를 복제·재배포할 권리는 다르다.
- 한글 텍스트를 정확히 생성하도록 이미지 모델에 맡기는 대신 수정 가능한 텍스트 객체로 렌더링한다.
- 안전성·IP 점검 결과는 검토 보조이며 법적 적합성이나 광고 매체 승인을 보증하지 않는다.
- 기존 솔루션의 기능·성과·리텐션에 대한 비교 우위는 실제 제품 조사와 고객 실험 전에는 가설로 유지한다.

## 4. 근거 갱신 방법

가격·API·약관 변경 확인 시 이 문서의 날짜와 영향받은 요구사항·이슈를 함께 갱신한다. 미확인 내용을 확정 사실로 승격하려면 공식 문서 또는 실제 계정 검증의 근거를 남긴다. 비밀키·광고 계정 토큰·고객 개인 정보는 저장하지 않는다.
