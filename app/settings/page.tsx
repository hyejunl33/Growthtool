import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { hasSupabaseConfig } from "../../lib/supabase/config";
import { createClient } from "../../lib/supabase/server";
import DeleteWorkspaceForm from "./delete-workspace-form";

export default async function SettingsPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return <main className="auth-shell"><section className="auth-card settings-card"><Link href="/" className="back-link"><ArrowLeft size={16} />대시보드</Link><div className="auth-logo"><Settings size={20} />Growth tool 설정</div><h1>계정과 데이터</h1><p className="auth-description">로그인 이메일은 <strong>{data.user.email}</strong>입니다. 워크스페이스 삭제를 요청하면 운영자가 저장된 제품·소재·파일을 확인 후 삭제합니다.</p><section className="danger-zone"><h2>워크스페이스 삭제</h2><p>삭제 요청 후 이 워크스페이스에 다시 접근할 수 없습니다.</p><DeleteWorkspaceForm /></section><footer className="legal-links"><Link href="/privacy">개인정보 처리 안내</Link><Link href="/terms">이용 조건</Link></footer></section></main>;
}
