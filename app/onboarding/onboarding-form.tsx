"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { ActionButton } from "../../seed-design/ui/action-button";
import { TextField, TextFieldInput, TextFieldTextarea } from "../../seed-design/ui/text-field";

export default function OnboardingForm({ initialName = "" }: { initialName?: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<"fashion" | "beauty">("fashion");
  const [primaryColor, setPrimaryColor] = useState("#FF6600");
  const [forbiddenTerms, setForbiddenTerms] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    const response = await fetch("/api/brand", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        primaryColor,
        forbiddenTerms: forbiddenTerms.split(",").map((value) => value.trim()).filter(Boolean),
      }),
    });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-card onboarding-card">
        <span className="auth-logo"><Sparkles size={22} />Growth tool</span>
        <p className="eyebrow">SET UP YOUR BRAND</p>
        <h1>브랜드 기준을<br />먼저 알려주세요.</h1>
        <p className="auth-description">생성 카피와 안전성 검토에 사용할 기본 정보예요.</p>
        <form onSubmit={submit}>
          <TextField label="브랜드명"><TextFieldInput value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} placeholder="예: 루미에르" /></TextField>
          <label className="seed-label">주요 카테고리<select value={category} onChange={(event) => setCategory(event.target.value as "fashion" | "beauty")}><option value="fashion">패션</option><option value="beauty">뷰티</option></select></label>
          <label className="seed-label">브랜드 대표 색상<div className="color-row"><input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /><span>{primaryColor}</span></div></label>
          <TextField label="금지 표현" description="쉼표로 구분해주세요. 나중에 수정할 수 있어요."><TextFieldTextarea value={forbiddenTerms} onChange={(event) => setForbiddenTerms(event.target.value)} placeholder="예: 무조건, 업계 1위" /></TextField>
          {status === "error" && <p className="error-box" role="alert">브랜드 정보를 저장하지 못했어요. 잠시 후 다시 시도해주세요.</p>}
          <ActionButton variant="brandSolid" type="submit" loading={status === "loading"} disabled={!name.trim() || status === "loading"}>설정 완료 <ArrowRight size={17} /></ActionButton>
        </form>
      </section>
    </main>
  );
}
