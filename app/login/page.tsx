"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Mail, Sparkles } from "lucide-react";
import { ActionButton } from "../../seed-design/ui/action-button";
import { TextField, TextFieldInput } from "../../seed-design/ui/text-field";
import { createClient } from "../../lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
      setStatus("sent");
      setMessage("로그인 링크를 보냈어요. 메일에서 링크를 열어주세요.");
    } catch {
      setStatus("error");
      setMessage("로그인 메일을 보내지 못했어요. 주소와 인증 설정을 확인해주세요.");
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="auth-logo"><Sparkles size={22} />Growth tool</span>
        <p className="eyebrow">PRIVATE BETA</p>
        <h1>오늘의 트렌드를<br />내 상품 소재로 바꾸세요.</h1>
        <p className="auth-description">초대받은 이메일로 로그인 링크를 받아 시작할 수 있어요.</p>
        <form onSubmit={submit}>
          <TextField label="이메일" prefixIcon={<Mail size={18} />} invalid={status === "error"} errorMessage={status === "error" ? message : undefined}>
            <TextFieldInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seller@example.com" required autoComplete="email" />
          </TextField>
          <ActionButton variant="brandSolid" type="submit" loading={status === "loading"} disabled={!email || status === "loading"}>
            로그인 링크 받기 <ArrowRight size={17} />
          </ActionButton>
        </form>
        {status === "sent" && <p className="auth-success" role="status">{message}</p>}
        <small>로그인하면 비공개 베타의 데이터 처리 안내와 알려진 한계에 동의하게 됩니다.</small>
        <footer className="legal-links"><Link href="/privacy">개인정보 처리 안내</Link><Link href="/terms">이용 조건</Link></footer>
      </section>
    </main>
  );
}
