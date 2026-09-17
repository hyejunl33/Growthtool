"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  BarChart3,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  Flame,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  X,
} from "lucide-react";
import type { Trend, TrendFeed } from "../lib/trends";
import { summarizePerformance, type PerformanceFeed } from "../lib/ad-platforms";
import { ActionButton } from "../seed-design/ui/action-button";
import JSZip from "jszip";
import NextImage from "next/image";
import { createClient as createSupabaseClient } from "../lib/supabase/client";
import type { CreativeVariant } from "../lib/creative";
import { reviewCopy } from "../lib/policy";

type Product = {
  name: string;
  category: string;
  facts: string;
  image?: string;
};

type Creative = {
  id: "A" | "B" | "C";
  headline: string;
  subline: string;
  cta: string;
  background: string;
  accent: string;
  status: "통과" | "확인 필요" | "차단";
  finding?: string;
  image?: string;
};

const initialProduct: Product = {
  name: "그로우 수분 장벽 세럼",
  category: "세럼·앰플",
  facts: "30ml, 무향, 투명한 젤 제형",
  image: "/demo-product.png",
};

const initialCreatives: Creative[] = [];

function sparkPath(values: number[]) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 36 - ((value - min) / Math.max(max - min, 1)) * 30;
    return `${index === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");
}

const creativeStyles: Record<Creative["id"], Pick<Creative, "background" | "accent">> = {
  A: { background: "#f3eee6", accent: "#2f2923" },
  B: { background: "#f3eee6", accent: "#2f2923" },
  C: { background: "#f3eee6", accent: "#2f2923" },
};

function presentVariants(variants: CreativeVariant[]): Creative[] {
  const fixedSubline = variants[0]?.subline || "확인된 상품 특징";
  const fixedCta = variants[0]?.cta || "자세히 보기";
  return variants.map((variant) => {
    const review = reviewCopy(`${variant.headline} ${fixedSubline} ${fixedCta}`);
    return {
      ...variant,
      subline: fixedSubline,
      cta: fixedCta,
      ...creativeStyles[variant.id],
      status: review.status,
      finding: review.findings[0]?.message,
    };
  });
}

function metricValue(value?: number) {
  return value === undefined || Number.isNaN(value) ? "—" : value.toLocaleString("ko-KR");
}

function readSavedState(): { product?: Product; savedTrends?: string[] } {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("growth-tool-state-v2") || "{}") as { product?: Product; savedTrends?: string[] };
  } catch {
    return {};
  }
}

export default function GrowthTool({ persistenceEnabled = false, judgeMode = false, workspaceSummary }: { persistenceEnabled?: boolean; judgeMode?: boolean; workspaceSummary?: { brandName: string; category: string; quotaUsed: number } }) {
  const [storedState] = useState(readSavedState);
  const [activeTab, setActiveTab] = useState<"dashboard" | "studio" | "performance">("dashboard");
  const [trends, setTrends] = useState<Trend[]>([]);
  const [trendFeed, setTrendFeed] = useState<TrendFeed | null>(null);
  const [savedTrends, setSavedTrends] = useState<string[]>(storedState.savedTrends || []);
  const [selectedTrend, setSelectedTrend] = useState<Trend | undefined>();
  const [product, setProduct] = useState<Product>({ ...initialProduct, ...storedState.product, image: storedState.product?.image || initialProduct.image });
  const [productFile, setProductFile] = useState<File | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>(initialCreatives);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  const [notice, setNotice] = useState("실데이터 연결 상태를 확인하고 있어요.");
  const [performanceFeed, setPerformanceFeed] = useState<PerformanceFeed | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [judgeCode, setJudgeCode] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const safeProduct = { ...product, image: undefined };
    localStorage.setItem("growth-tool-state-v2", JSON.stringify({ product: safeProduct, savedTrends }));
  }, [product, savedTrends]);

  useEffect(() => {
    let live = true;
    void fetch("/api/trends", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<TrendFeed> : Promise.reject(new Error("TREND_FETCH_FAILED")))
      .then((feed) => {
        if (!live) return;
        setTrendFeed(feed);
        setTrends(feed.trends);
        setSelectedTrend((current) => feed.trends.find((trend) => trend.id === current?.id) || feed.trends[0]);
        if (feed.message) setNotice(feed.message);
      })
      .catch(() => {
        if (live) setNotice("트렌드 API 연결에 실패했어요. 예시 데이터는 표시하지 않습니다.");
      });
    return () => { live = false; };
  }, []);

  async function refreshPerformance() {
    setPerformanceLoading(true);
    try {
      const response = await fetch("/api/performance", { cache: "no-store" });
      if (!response.ok) throw new Error("PERFORMANCE_FETCH_FAILED");
      setPerformanceFeed(await response.json() as PerformanceFeed);
      setNotice("연결된 광고 플랫폼에서 최신 성과를 불러왔어요.");
    } catch { setNotice("광고 플랫폼 성과를 불러오지 못했어요."); }
    finally { setPerformanceLoading(false); }
  }

  function saveTrend(trend: Trend) {
    setSavedTrends((current) => current.includes(trend.id) ? current.filter((id) => id !== trend.id) : [...current, trend.id]);
  }

  function startStudio(trend?: Trend) {
    if (trend) setSelectedTrend(trend);
    setActiveTab("studio");
    setNotice(trend ? `“${trend.title}” 신호를 기획에 연결했어요.` : "상품 중심 기획으로 시작했어요.");
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!product.name.trim() || !product.facts.trim() || (!productFile && !product.image)) {
      setNotice("상품명, 확인된 특징, 실제 제품 사진이 모두 필요해요.");
      return;
    }
    if (judgeMode && judgeCode.trim().length < 8) {
      setNotice("심사 체험 코드를 입력해주세요.");
      return;
    }
    const aiHeaders = judgeMode ? { "X-Judge-Access-Code": judgeCode.trim() } : undefined;
    let sourceFile = productFile;
    if (!sourceFile && product.image) {
      try {
        const demoResponse = await fetch(product.image);
        if (!demoResponse.ok) throw new Error("DEMO_IMAGE_FETCH_FAILED");
        const demoBlob = await demoResponse.blob();
        sourceFile = new File([demoBlob], "growth-tool-demo-product.png", { type: demoBlob.type || "image/png" });
      } catch {
        setNotice("기본 제품 이미지를 불러오지 못했어요. 직접 이미지를 등록해주세요.");
        return;
      }
    }
    if (!sourceFile) return;
    let productVersionId: string | undefined;
    if (persistenceEnabled) {
      setNotice("제품 사진을 안전하게 확인하고 저장하고 있어요.");
      try {
        const ticketResponse = await fetch("/api/products/upload-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mime: sourceFile.type, bytes: sourceFile.size }),
        });
        if (!ticketResponse.ok) throw new Error("UPLOAD_TICKET_FAILED");
        const ticket = (await ticketResponse.json()) as { data: { path: string; token: string } };
        const supabase = createSupabaseClient();
        const { error: uploadError } = await supabase.storage.from("private-assets").uploadToSignedUrl(ticket.data.path, ticket.data.token, sourceFile, { contentType: sourceFile.type });
        if (uploadError) throw uploadError;
        const productResponse = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: product.name,
            category: product.category,
            price: null,
            facts: product.facts.split(",").map((value) => value.trim()).filter(Boolean),
            uploads: [{ path: ticket.data.path, mime: sourceFile.type, bytes: sourceFile.size }],
          }),
        });
        if (!productResponse.ok) throw new Error("PRODUCT_SAVE_FAILED");
        const storedProduct = await productResponse.json() as { data: { productVersionId: string } };
        productVersionId = storedProduct.data.productVersionId;
      } catch {
        setNotice("제품 사진을 저장하지 못했어요. 형식·크기와 Storage 설정을 확인해주세요.");
        return;
      }
    }
    setNotice("AI가 제품 사진과 확인된 사실로 소재를 만들고 있어요. 최대 1분 정도 걸릴 수 있어요.");
    try {
      const response = await fetch("/api/creatives", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...aiHeaders },
        body: JSON.stringify({
          product,
          productVersionId,
          idempotencyKey: persistenceEnabled ? crypto.randomUUID() : undefined,
          trend: selectedTrend ? {
            title: selectedTrend.title,
            category: selectedTrend.category,
            description: selectedTrend.description,
          } : null,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "CREATIVE_GENERATION_FAILED");
      }
      const result = await response.json() as { data: { provider: "openai"; variants: CreativeVariant[] } };
      const imageForm = new FormData(); imageForm.append("image", sourceFile); imageForm.append("productName", product.name); imageForm.append("productFacts", product.facts); imageForm.append("trend", selectedTrend?.title || "");
      const imageResponse = await fetch("/api/creative-image", { method: "POST", headers: aiHeaders, body: imageForm });
      if (!imageResponse.ok) { const body = await imageResponse.json().catch(() => ({})) as { error?: string }; throw new Error(body.error || "CREATIVE_IMAGE_GENERATION_FAILED"); }
      const imageResult = await imageResponse.json() as { data: { image: string } };
      const productReview = reviewCopy(product.facts);
      const next = presentVariants(result.data.variants).map((creative) => productReview.status === "차단" ? { ...creative, image: imageResult.data.image, status: "차단" as const, finding: productReview.findings[0]?.message } : { ...creative, image: imageResult.data.image });
      const blocked = next.some((creative) => creative.status === "차단");
      setCreatives(next);
      setNotice(blocked
        ? "검토에서 차단 표현을 발견했어요. 문구를 수정해야 내보낼 수 있어요."
        : "OpenAI가 실제 제품 사진을 편집하고 카피 3종을 만들었어요.");
    } catch (error) {
      setNotice(error instanceof Error && error.message.includes("NOT_CONFIGURED")
        ? "OpenAI API 키가 연결되지 않았어요. 환경변수를 설정한 뒤 다시 시도하세요."
        : error instanceof Error && (error.message.includes("AUTH_REQUIRED") || error.message.includes("UNAUTHORIZED"))
          ? "심사 체험 코드가 올바르지 않아요. 발급받은 코드를 확인해주세요."
          : "AI 소재 생성에 실패했어요. API 권한·크레딧과 이미지 형식을 확인하세요.");
    }
  }

  function updateCreative(key: keyof Creative, value: string) {
    if (!selectedCreative) return;
    const updated = { ...selectedCreative, [key]: value };
    const review = reviewCopy(updated.headline + updated.subline + updated.cta);
    updated.status = review.status;
    updated.finding = review.findings[0]?.message;
    setSelectedCreative(updated);
    setCreatives((current) => current.map((creative) => creative.id === updated.id ? updated : creative));
  }

  async function exportCreative(creative: Creative) {
    if (creative.status === "차단") {
      setNotice("차단된 소재는 내보낼 수 없어요. 문구를 수정한 뒤 다시 검토하세요.");
      return;
    }
    const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] || character);
    const headline = creative.headline.split("\n").map((line, index) => `<tspan x="84" dy="${index ? 110 : 0}">${escapeXml(line)}</tspan>`).join("");
    const visual = creative.image || product.image;
    const productVisual = visual ? `<image href="${escapeXml(visual)}" x="0" y="0" width="1080" height="1080" preserveAspectRatio="xMidYMid slice"/>` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="1080" height="1080" fill="${creative.background}"/>${productVisual}<rect x="46" y="46" width="520" height="988" rx="38" fill="#ffffff" opacity=".78"/><text x="84" y="150" font-family="Arial, sans-serif" font-size="30" fill="${creative.accent}">GROWTH TOOL / ${creative.id}</text><text x="84" y="350" font-family="Arial, sans-serif" font-size="72" font-weight="700" fill="${creative.accent}">${headline}</text><text x="84" y="670" font-family="Arial, sans-serif" font-size="32" fill="${creative.accent}">${escapeXml(creative.subline)}</text><rect x="84" y="814" width="286" height="86" rx="43" fill="${creative.accent}"/><text x="126" y="870" font-family="Arial, sans-serif" font-size="31" fill="#ffffff">${escapeXml(creative.cta)}</text><text x="84" y="980" font-family="Arial, sans-serif" font-size="22" fill="${creative.accent}">${escapeXml(product.name)} · 확인된 정보 기반 초안</text></svg>`;
    try {
      const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      const image = new Image();
      const png = await new Promise<Blob>((resolve, reject) => {
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 1080;
          canvas.height = 1080;
          canvas.getContext("2d")?.drawImage(image, 0, 0);
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG_RENDER_FAILED")), "image/png");
        };
        image.onerror = () => reject(new Error("SVG_RENDER_FAILED"));
        image.src = svgUrl;
      });
      URL.revokeObjectURL(svgUrl);
      const exportId = crypto.randomUUID();
      const zip = new JSZip();
      zip.file(`growth-tool-${creative.id}-${exportId}.png`, png);
      zip.file("copy.txt", `${creative.headline}\n\n${creative.subline}\n${creative.cta}`);
      zip.file("experiment.md", `# ${creative.id}안\n\n비교 변수: 헤드라인\n트렌드: ${selectedTrend?.title || "상품 중심"}\n상품: ${product.name}\n`);
      zip.file("scene.json", JSON.stringify({ canvas: { width: 1080, height: 1080, colorSpace: "sRGB" }, creative, product: { name: product.name }, exportId }, null, 2));
      zip.file("manifest.json", JSON.stringify({ exportId, createdAt: new Date().toISOString(), version: "mvp-1", assets: [`growth-tool-${creative.id}-${exportId}.png`, "copy.txt", "experiment.md", "scene.json"] }, null, 2));
      const archive = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(archive);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `growth-tool-${creative.id}-${exportId}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice(`${creative.id}안 PNG와 실험 명세 ZIP을 만들었어요. 광고 집행 전 매체 가이드라인을 확인하세요.`);
    } catch {
      setNotice("PNG 파일을 만들지 못했어요. 이미지와 폰트가 모두 로드된 뒤 다시 시도하세요.");
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
      setNotice("JPG, PNG, WebP 형식의 10MB 이하 이미지로 등록하세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setProductFile(file);
      setProduct((current) => ({ ...current, image: String(reader.result) }));
      const form = new FormData();
      form.append("image", file);
      try {
        const response = await fetch("/api/images/remove-background", { method: "POST", body: form });
        if (response.status === 501) {
          setNotice("제품 원본을 등록했어요. Photoroom 키를 설정하면 배경을 자동 제거합니다.");
          return;
        }
        if (!response.ok) throw new Error("BACKGROUND_REMOVAL_FAILED");
        const cutout = await response.blob();
        const cutoutReader = new FileReader();
        cutoutReader.onload = () => setProduct((current) => ({ ...current, image: String(cutoutReader.result) }));
        cutoutReader.readAsDataURL(cutout);
        setNotice("제품 배경을 제거했어요. 원본은 별도로 안전하게 저장됩니다.");
      } catch {
        setNotice("배경 제거에 실패해 원본 사진으로 계속 진행합니다.");
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Sparkles size={18} /></span><span>Growth tool</span></div>
        <nav aria-label="주요 메뉴">
          <button className={activeTab === "dashboard" ? "nav-item active" : "nav-item"} onClick={() => setActiveTab("dashboard")}><LayoutDashboard size={18} />오늘의 트렌드</button>
          <button className={activeTab === "studio" ? "nav-item active" : "nav-item"} onClick={() => setActiveTab("studio")}><Sparkles size={18} />크리에이티브 스튜디오</button>
          <button className={activeTab === "performance" ? "nav-item active" : "nav-item"} onClick={() => setActiveTab("performance")}><BarChart3 size={18} />성과 비교</button>
          {persistenceEnabled && <a className="nav-item" href="/settings"><Settings size={18} />설정</a>}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace"><span className="avatar">{(workspaceSummary?.brandName || "G").slice(0, 1)}</span><div><strong>{workspaceSummary?.brandName || "브랜드 미설정"}</strong><small>뷰티 · PoC 워크스페이스</small></div></div>
          <div className="quota"><span>이번 주 생성량</span><strong>{workspaceSummary?.quotaUsed ?? 0} <small>/ 5 세트</small></strong><div className="progress"><i style={{ width: `${Math.min(100, ((workspaceSummary?.quotaUsed ?? 0) / 5) * 100)}%` }} /></div></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar"><div><p className="eyebrow">BEAUTY PERFORMANCE CREATIVE OS</p><h1>{activeTab === "dashboard" ? "오늘의 기회" : activeTab === "studio" ? "크리에이티브 스튜디오" : "내 광고 성과"}</h1></div>{persistenceEnabled ? <form action="/auth/logout" method="post"><button className="outline-button" type="submit"><LogOut size={16} />로그아웃</button></form> : <button className="outline-button" onClick={() => { localStorage.removeItem("growth-tool-state-v2"); window.location.reload(); }}><Clock3 size={16} />입력 초기화</button>}</header>
        <div className="notice" role="status"><Sparkles size={16} />{notice}</div>

        {activeTab === "dashboard" && <Dashboard trends={trends} feed={trendFeed} savedTrends={savedTrends} selectedTrend={selectedTrend} onSave={saveTrend} onSelect={setSelectedTrend} onStart={startStudio} />}
        {activeTab === "studio" && <Studio product={product} selectedTrend={selectedTrend} creatives={creatives} fileRef={fileRef} judgeMode={judgeMode} judgeCode={judgeCode} onJudgeCode={setJudgeCode} onProduct={setProduct} onImage={handleFile} onGenerate={generate} onEdit={setSelectedCreative} onExport={exportCreative} />}
        {activeTab === "performance" && <Performance feed={performanceFeed} loading={performanceLoading} onRefresh={refreshPerformance} />}
      </section>

      {selectedCreative && <Editor creative={selectedCreative} product={product} onClose={() => setSelectedCreative(null)} onUpdate={updateCreative} onExport={exportCreative} />}
    </main>
  );
}

function Dashboard({ trends, feed, savedTrends, selectedTrend, onSave, onSelect, onStart }: { trends: Trend[]; feed: TrendFeed | null; savedTrends: string[]; selectedTrend?: Trend; onSave: (trend: Trend) => void; onSelect: (trend: Trend) => void; onStart: (trend?: Trend) => void }) {
  return <div className="dashboard-grid">
    <section className="hero-card"><div><p className="eyebrow">LIVE · BEAUTY ONLY</p><h2>지금 뜨는 뷰티 신호를<br />실제 광고 소재로 바꾸세요.</h2><p>네이버·X·TikTok의 연결된 실데이터만 표시합니다.</p><ActionButton variant="brandSolid" className="seed-action" onClick={() => onStart(selectedTrend)}><Sparkles size={17} />{selectedTrend ? `“${selectedTrend.title}”로 제작` : "제품 사진으로 제작"}<ChevronRight size={17} /></ActionButton></div><div className="hero-orb"><Flame size={58} /><span>{selectedTrend?.growth === null || selectedTrend?.growth === undefined ? "LIVE" : `${selectedTrend.growth >= 0 ? "+" : ""}${selectedTrend.growth}%`}<small>{selectedTrend?.provider || "실데이터 대기"}</small></span></div></section>
    <section className="signal-panel"><div className="section-heading"><div><p className="eyebrow">DATA CONNECTIONS</p><h2>트렌드 소스</h2></div><span className="fresh"><span />{feed?.freshness === "fresh" ? "실데이터 · 최신" : "연결 확인 필요"}</span></div><div className="provider-list">{feed?.providers.map((item) => <a key={item.provider} href={item.sourceUrl} target="_blank" rel="noreferrer" className={`provider-row ${item.status}`}><div><strong>{item.label}</strong><small>{item.message}</small></div><span>{item.status === "live" ? "연결됨" : item.status === "error" ? "오류" : "설정 필요"}<ExternalLink size={13} /></span></a>) || <p className="source-note">연결 상태를 확인하고 있어요.</p>}</div><p className="source-note">TikTok은 공식 공개 트렌드 API가 없어 승인된 데이터 공급자 URL을 연결합니다. 가짜 수치나 샘플 키워드는 표시하지 않습니다.</p></section>
    <section className="trend-section"><div className="section-heading"><div><p className="eyebrow">REAL BEAUTY SIGNALS</p><h2>떠오르는 키워드</h2></div><span className="text-button"><Search size={16} />{trends.length}개 실측</span></div>{trends.length ? <div className="trend-list">{trends.map((trend) => <article className={selectedTrend?.id === trend.id ? "trend-card selected" : "trend-card"} key={trend.id} onClick={() => onSelect(trend)}><div className="trend-color" style={{ background: trend.color }}><TrendingUp size={19} /></div><div className="trend-copy"><div><span className="pill">{trend.provider}</span><strong>{trend.title}</strong></div><p>{trend.description}</p>{trend.values.length > 1 && <svg viewBox="0 0 100 42" aria-label={`${trend.title} 추이`}><path d={sparkPath(trend.values)} /></svg>}</div><div className="trend-meta"><b>{trend.growth === null ? "실시간" : `${trend.growth >= 0 ? "+" : ""}${trend.growth}%`}</b><small>신호 {trend.score}</small><button aria-label={`${trend.title} 저장`} className={savedTrends.includes(trend.id) ? "save-button saved" : "save-button"} onClick={(event) => { event.stopPropagation(); onSave(trend); }}>{savedTrends.includes(trend.id) ? <Check size={16} /> : <Plus size={16} />}</button></div></article>)}</div> : <div className="empty-performance"><TrendingUp size={34} /><h3>표시할 실데이터가 없어요</h3><p>위 소스의 API 자격증명을 연결하면 실제 뷰티 키워드만 나타납니다.</p></div>}</section>
  </div>;
}

function Studio({ product, selectedTrend, creatives, fileRef, judgeMode, judgeCode, onJudgeCode, onProduct, onImage, onGenerate, onEdit, onExport }: { product: Product; selectedTrend?: Trend; creatives: Creative[]; fileRef: React.RefObject<HTMLInputElement | null>; judgeMode: boolean; judgeCode: string; onJudgeCode: (value: string) => void; onProduct: React.Dispatch<React.SetStateAction<Product>>; onImage: (event: ChangeEvent<HTMLInputElement>) => void; onGenerate: (event: FormEvent) => void; onEdit: (creative: Creative) => void; onExport: (creative: Creative) => void }) {
  return (
    <div className="studio-grid">
      <section className="brief-panel">
        <div className="section-heading"><div><p className="eyebrow">1. PRODUCT FACTS</p><h2>상품 정보</h2></div><span className="draft">자동 저장</span></div>
        <form onSubmit={onGenerate}>
          {judgeMode && <label>심사 체험 코드 <small>입력값은 서버나 브라우저 저장소에 보관하지 않습니다</small><input type="password" autoComplete="off" value={judgeCode} onChange={(event) => onJudgeCode(event.target.value)} placeholder="체험 코드 입력" /></label>}
          <label>상품명<input value={product.name} onChange={(event) => onProduct((current) => ({ ...current, name: event.target.value }))} placeholder="예: 수분 장벽 세럼" /></label>
          <label>뷰티 세부 카테고리<input value={product.category} onChange={(event) => onProduct((current) => ({ ...current, category: event.target.value }))} placeholder="예: 세럼·앰플" /></label>
          <label>확인된 특징 <small>광고 카피에만 이 내용을 사용합니다</small><textarea value={product.facts} onChange={(event) => onProduct((current) => ({ ...current, facts: event.target.value }))} placeholder="전성분·용량·제형·인체적용시험 등 확인된 사실만 입력하세요" /></label>
          <input ref={fileRef} className="hidden-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={onImage} />
          <button type="button" className="upload-box" onClick={() => fileRef.current?.click()}>
            {product.image ? <NextImage src={product.image} alt="등록한 상품" width={600} height={400} unoptimized /> : <><ImagePlus size={22} /><span>제품 사진 추가</span><small>JPG, PNG, WebP · 최대 10MB</small></>}
          </button>
          <div className="trend-connection"><div><TrendingUp size={17} /><span>선택한 신호</span></div><strong>{selectedTrend?.title || "상품 중심 기획"}</strong><p>{selectedTrend ? `${selectedTrend.description} · 최근 3일 +${selectedTrend.growth}%` : "트렌드를 고르지 않아도 제작할 수 있어요."}</p></div>
          <ActionButton variant="brandSolid" className="seed-action wide" type="submit"><Sparkles size={17} />AI 이미지 + 카피 3종 만들기</ActionButton>
        </form>
      </section>
      <section className="creative-panel">
        <div className="section-heading"><div><p className="eyebrow">2. AI CREATIVE · 3 VARIANTS</p><h2>생성된 소재</h2></div>{creatives.length > 0 && <span className="status-dot"><span />실제 생성 완료</span>}</div>
        <p className="panel-intro">OpenAI가 실제 제품 사진으로 키 비주얼을 만들고, 동일 이미지에서 헤드라인만 비교합니다.</p>
        {creatives.length ? <div className="creative-grid">{creatives.map((creative) => (
          <article className="creative-card" key={creative.id}>
            <CreativePreview creative={creative} product={product} />
            <div className="creative-card-footer"><div><span className={`review ${creative.status === "통과" ? "pass" : creative.status === "차단" ? "block" : "warn"}`}>{creative.status === "통과" ? <ShieldCheck size={14} /> : <CircleAlert size={14} />}{creative.status}</span><strong>{creative.id}안</strong></div><div><button aria-label={`${creative.id}안 편집`} onClick={() => onEdit(creative)}><Pencil size={16} /></button><button aria-label={`${creative.id}안 내보내기`} onClick={() => onExport(creative)}><Download size={16} /></button></div></div>
            {creative.finding && <p className="finding"><CircleAlert size={14} />{creative.finding}</p>}
          </article>
        ))}</div> : <div className="empty-performance"><ImagePlus size={34} /><h3>생성된 소재가 없어요</h3><p>실제 제품 사진과 확인된 상품 사실을 넣어 AI 생성을 시작하세요.</p></div>}
        <div className="experiment-note"><BarChart3 size={18} /><div><strong>실험 메모</strong><p>A/B/C는 헤드라인만 다릅니다. 집행 시 동일 타깃·예산·기간으로 설정해야 비교할 수 있어요.</p></div></div>
      </section>
    </div>
  );
}

function CreativePreview({ creative, product }: { creative: Creative; product: Product }) {
  return <div className="creative-preview" style={{ background: creative.background, color: creative.accent }}>{creative.image && <NextImage className="generated-backdrop" src={creative.image} alt="AI가 제품 사진으로 생성한 광고 배경" fill sizes="420px" unoptimized />}<span className="variant-label">VARIANT {creative.id}</span><div className="preview-copy"><h3>{creative.headline.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</h3><p>{creative.subline}</p><button style={{ background: creative.accent }}>{creative.cta}</button></div>{!creative.image && <div className={product.image ? "product-visual has-image" : "product-visual"} style={{ borderColor: creative.accent }}>{product.image && <NextImage src={product.image} alt="상품" width={500} height={600} unoptimized />}</div>}<small>{product.name}</small></div>;
}

function Editor({ creative, product, onClose, onUpdate, onExport }: { creative: Creative; product: Product; onClose: () => void; onUpdate: (key: keyof Creative, value: string) => void; onExport: (creative: Creative) => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="소재 편집"><div className="editor-modal"><header><div><p className="eyebrow">VARIANT {creative.id} · EDITOR</p><h2>텍스트 레이어 편집</h2></div><button onClick={onClose} aria-label="편집기 닫기"><X /></button></header><div className="editor-body"><CreativePreview creative={creative} product={product} /><div className="editor-controls"><label>헤드라인<textarea value={creative.headline} onChange={(e) => onUpdate("headline", e.target.value)} /></label><label>보조 문구<input value={creative.subline} onChange={(e) => onUpdate("subline", e.target.value)} /></label><label>CTA<input value={creative.cta} onChange={(e) => onUpdate("cta", e.target.value)} /></label><label>배경 색상<input type="color" value={creative.background} onChange={(e) => onUpdate("background", e.target.value)} /></label><div className={`policy-box ${creative.status === "차단" ? "blocked" : ""}`}>{creative.status === "통과" ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}<div><strong>{creative.status === "차단" ? "내보내기 차단" : "검토 가능"}</strong><p>{creative.finding || "편집 후 검토가 새로 적용됐어요."}</p></div></div><div className="editor-actions"><button className="outline-button" onClick={onClose}><Save size={16} />저장됨</button><ActionButton variant="brandSolid" className="seed-action" onClick={() => onExport(creative)}><ArrowDownToLine size={16} />내보내기</ActionButton></div></div></div></div></div>;
}

function Performance({ feed, loading, onRefresh }: { feed: PerformanceFeed | null; loading: boolean; onRefresh: () => void }) {
  const rows = feed?.rows || []; const sameCurrency = new Set(rows.map((row) => row.currency)).size <= 1; const performance = sameCurrency ? summarizePerformance(rows) : null;
  return <div className="performance-page"><section className="performance-hero"><div><p className="eyebrow">3. PERFORMANCE · NEXT PHASE</p><h2>광고 성과 연동<br />설계 미리보기.</h2><p>심사용 MVP에서는 트렌드 기반 배너 제작을 먼저 검증합니다. Meta·TikTok·Google Ads·Moloco 읽기 연동은 다음 단계 범위입니다.</p></div><ActionButton variant="brandSolid" className="seed-action" onClick={onRefresh} disabled={loading}>{loading ? <Clock3 size={17} /> : <RefreshCw size={17} />}{loading ? "확인 중" : "연동 상태 보기"}</ActionButton></section><section className="metrics-detail"><div className="section-heading"><div><p className="eyebrow">CONNECTION MOCKUP</p><h2>광고 계정 연결 예정</h2></div>{feed && <span className="status-dot"><span />{feed.range.since} — {feed.range.until}</span>}</div><div className="connection-grid">{(feed?.connections || [
    { platform: "meta", label: "Meta Ads", configured: false, status: "unconfigured", message: "동기화를 눌러 연결 상태를 확인하세요.", docsUrl: "https://developers.facebook.com/docs/marketing-api/insights/" },
    { platform: "tiktok", label: "TikTok Ads", configured: false, status: "unconfigured", message: "동기화를 눌러 연결 상태를 확인하세요.", docsUrl: "https://business-api.tiktok.com/portal/docs" },
    { platform: "google-ads", label: "Google Ads", configured: false, status: "unconfigured", message: "동기화를 눌러 연결 상태를 확인하세요.", docsUrl: "https://developers.google.com/google-ads/api/docs/reporting/overview" },
    { platform: "moloco", label: "Moloco", configured: false, status: "unconfigured", message: "동기화를 눌러 연결 상태를 확인하세요.", docsUrl: "https://developer.moloco.cloud/reference/dspapi_queryanalyticsdetail" },
  ] as PerformanceFeed["connections"]).map((connection) => <a className={`connection-card ${connection.status}`} key={connection.platform} href={connection.docsUrl} target="_blank" rel="noreferrer"><span>{connection.label}</span><strong>{connection.status === "live" ? "연결됨" : connection.status === "error" ? "API 오류" : "연결 필요"}</strong><small>{connection.message}</small><ExternalLink size={14} /></a>)}</div></section>{performance && rows.length ? <><div className="metric-cards"><MetricCard label="노출" value={metricValue(performance.impressions)} note="연결된 플랫폼 합계" /><MetricCard label="CTR" value={performance.ctr === null ? "계산 불가" : `${performance.ctr.toFixed(2)}%`} note="클릭 ÷ 노출" /><MetricCard label="CPC" value={performance.cpc === null ? "계산 불가" : `₩${Math.round(performance.cpc).toLocaleString("ko-KR")}`} note="비용 ÷ 클릭" /><MetricCard label="ROAS" value={performance.roas === null ? "구매 데이터 없음" : `${performance.roas.toFixed(2)}x`} note="전환 가치 ÷ 비용" /></div><section className="metrics-detail"><div className="section-heading"><div><p className="eyebrow">LIVE REPORT</p><h2>플랫폼별 성과 행</h2></div><span className="status-dot"><span />{rows.length}개 실측 행</span></div><div className="performance-table">{rows.slice(0, 20).map((row, index) => <div key={`${row.platform}-${row.adId}-${row.date}-${index}`}><span>{row.date}</span><strong>{row.platform}</strong><span>{row.adName || row.campaignName || row.adId || "계정 합계"}</span><span>{row.impressions.toLocaleString("ko-KR")}회</span><span>{row.spend.toLocaleString("ko-KR")} {row.currency}</span></div>)}</div></section></> : <section className="empty-performance"><BarChart3 size={34} /><h3>{rows.length && !sameCurrency ? "통화가 달라 합산할 수 없어요" : "동기화된 실측 성과가 없어요"}</h3><p>{rows.length && !sameCurrency ? "플랫폼별 원본 행은 유지하며 환율을 임의 적용하지 않습니다." : "플랫폼 자격증명을 설정하고 동기화를 실행하세요."}</p></section>}</div>;
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
