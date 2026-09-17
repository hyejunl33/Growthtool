"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteWorkspaceForm() {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError("");
    const response = await fetch("/api/account/deletion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation }) });
    if (!response.ok) { setError("확인 문구를 정확히 입력하거나 잠시 뒤 다시 시도해주세요."); setLoading(false); return; }
    router.replace("/login?deleted=requested");
    router.refresh();
  }

  return <form onSubmit={submit} className="danger-form"><label className="seed-label">확인을 위해 <strong>워크스페이스 삭제</strong>를 입력하세요.<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{error && <p className="auth-error">{error}</p>}<button type="submit" className="danger-button" disabled={loading || confirmation !== "워크스페이스 삭제"}><Trash2 size={16} />{loading ? "요청 중…" : "삭제 요청"}</button></form>;
}
