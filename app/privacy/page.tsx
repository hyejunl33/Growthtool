import Link from "next/link";

export default function PrivacyPage() {
  return <main className="auth-shell"><article className="auth-card legal-card"><Link href="/" className="back-link">← Growth tool</Link><h1>개인정보 처리 안내</h1><p>Growth tool 비공개 베타는 로그인 이메일, 브랜드 설정, 사용자가 올린 제품 이미지와 상품 사실, 생성 소재, 사용량을 서비스 제공과 오류 대응 목적으로 처리합니다.</p><h2>보관과 제공</h2><p>제품 파일은 비공개 저장소에 보관하며 다른 워크스페이스에서 읽을 수 없도록 접근 정책을 적용합니다. AI·배경 제거 기능을 사용할 때 필요한 입력만 설정된 외부 처리업체로 전송합니다.</p><h2>삭제 요청</h2><p>로그인 후 설정에서 워크스페이스 삭제를 요청할 수 있습니다. 베타 운영자는 요청을 확인해 데이터와 파일을 삭제하고 법적 보관 의무가 있는 최소 기록만 보존합니다.</p><p className="legal-updated">시행일: 2026년 9월 17일 · 비공개 베타 안내</p></article></main>;
}
