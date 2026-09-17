import Link from "next/link";

export default function TermsPage() {
  return <main className="auth-shell"><article className="auth-card legal-card"><Link href="/" className="back-link">← Growth tool</Link><h1>비공개 베타 이용 조건</h1><p>Growth tool은 패션·뷰티 셀러의 트렌드 탐색과 광고 소재 초안 제작을 돕는 테스트 서비스입니다. 생성 결과는 광고 성과를 보장하지 않으며, 사용자는 집행 전 상품 사실·가격·권리·매체 정책을 확인해야 합니다.</p><h2>사용자 책임</h2><p>업로드할 권리가 있는 제품 이미지와 사실만 등록해야 합니다. 타인의 개인정보, 저작물, 상표를 권한 없이 올리거나 위법한 광고에 사용할 수 없습니다.</p><h2>베타 운영</h2><p>기능과 제공 한도는 테스트 중 변경될 수 있습니다. 오류나 접근 문제가 있으면 GitHub 저장소의 이슈로 알려주세요.</p><p className="legal-updated">시행일: 2026년 9월 17일 · 비공개 베타 조건</p></article></main>;
}
