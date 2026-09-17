"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { calculatePerformance, parseMetricsCsv, type Metric } from "../lib/metrics";
import { demoTrends, type Trend, type TrendFeed } from "../lib/trends";
import { ActionButton } from "../seed-design/ui/action-button";
import JSZip from "jszip";
import NextImage from "next/image";
import { createClient as createSupabaseClient } from "../lib/supabase/client";
import type { CreativeVariant } from "../lib/creative";
import { reviewCopy } from "../lib/policy";

type Product = {
  name: string;
  category: string;
  price: string;
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
};

const initialProduct: Product = {
  name: "루미에르 소프트 재킷",
  category: "여성 아우터",
  price: "129,000",
  facts: "가벼운 세미 오버핏, 베이지 컬러, 출근룩에 어울리는 단정한 실루엣",
};

const initialCreatives: Creative[] = [
  { id: "A", headline: "매일 손이 가는\n소프트 재킷", subline: "가볍게 걸치고, 단정하게 완성해요", cta: "지금 만나보기", background: "#f2eee8", accent: "#3f352c", status: "통과" },
  { id: "B", headline: "가을 출근룩의\n가장 쉬운 시작", subline: "출근부터 약속까지 자연스럽게", cta: "스타일 보기", background: "#e9e2d8", accent: "#5b4434", status: "통과" },
  { id: "C", headline: "한 벌로 정리되는\n간절기 레이어드", subline: "확인된 상품 특징만 사용한 카피", cta: "컬렉션 보기", background: "#e5e9e2", accent: "#304239", status: "확인 필요", finding: "‘가장 쉬운’ 같은 비교 표현은 브랜드 톤을 확인하세요." },
];

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
  B: { background: "#e8e1d6", accent: "#563f2e" },
  C: { background: "#e5ebe6", accent: "#33463d" },
};

function presentVariants(variants: CreativeVariant[]): Creative[] {
  return variants.map((variant) => {
    const review = reviewCopy(`${variant.headline} ${variant.subline} ${variant.cta}`);
    return {
      ...variant,
      ...creativeStyles[variant.id],
      status: review.status,
      finding: review.findings[0]?.message,
    };
  });
}

function metricValue(value?: number) {
  return value === undefined || Number.isNaN(value) ? "—" : value.toLocaleString("ko-KR");
}

function readSavedState(): { product?: Product; creatives?: Creative[]; savedTrends?: string[] } {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("growth-tool-state") || "{}") as { product?: Product; creatives?: Creative[]; savedTrends?: string[] };
  } catch {
    return {};
  }
}

export default function GrowthTool({ persistenceEnabled = false, workspaceSummary }: { persistenceEnabled?: boolean; workspaceSummary?: { brandName: string; category: string; quotaUsed: number } }) {
  const [storedState] = useState(readSavedState);
  const [activeTab, setActiveTab] = useState<"dashboard" | "studio" | "performance">("dashboard");
  const [trends, setTrends] = useState<Trend[]>(demoTrends);
  const [trendProvider, setTrendProvider] = useState<TrendFeed["provider"]>("demo");
  const [trendFreshness, setTrendFreshness] = useState<TrendFeed["freshness"]>("demo");
  const [savedTrends, setSavedTrends] = useState<string[]>(storedState.savedTrends || ["t1"]);
  const [selectedTrend, setSelectedTrend] = useState<Trend | undefined>(demoTrends[0]);
  const [product, setProduct] = useState<Product>(storedState.product || initialProduct);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>(storedState.creatives || initialCreatives);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  const [notice, setNotice] = useState("오늘의 트렌드 데이터를 확인했어요.");
  const [metrics, setMetrics] = useState<Metric | null>(null);
  const [csvError, setCsvError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("growth-tool-state", JSON.stringify({ product, creatives, savedTrends }));
  }, [product, creatives, savedTrends]);

  useEffect(() => {
    let live = true;
    void fetch("/api/trends", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<TrendFeed> : Promise.reject(new Error("TREND_FETCH_FAILED")))
      .then((feed) => {
        if (!live || feed.trends.length === 0) return;
        setTrends(feed.trends);
        setTrendProvider(feed.provider);
        setTrendFreshness(feed.freshness);
        setSelectedTrend((current) => feed.trends.find((trend) => trend.id === current?.id) || feed.trends[0]);
        if (feed.message) setNotice(feed.message);
      })
      .catch(() => {
        if (live) setNotice("트렌드 API에 연결하지 못해 데모 신호를 표시하고 있어요.");
      });
    return () => { live = false; };
  }, []);

  const performance = useMemo(() => metrics ? calculatePerformance(metrics) : null, [metrics]);

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
    if (!product.name.trim() || !product.facts.trim()) {
      setNotice("상품명과 확인된 특징을 입력해야 카피를 만들 수 있어요.");
      return;
    }
    let productVersionId: string | undefined;
    if (persistenceEnabled) {
      if (!productFile) {
        setNotice("외부 테스트에서는 제품 사진을 등록해야 소재를 만들 수 있어요.");
        return;
      }
      setNotice("제품 사진을 안전하게 확인하고 저장하고 있어요.");
      try {
        const ticketResponse = await fetch("/api/products/upload-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mime: productFile.type, bytes: productFile.size }),
        });
        if (!ticketResponse.ok) throw new Error("UPLOAD_TICKET_FAILED");
        const ticket = (await ticketResponse.json()) as { data: { path: string; token: string } };
        const supabase = createSupabaseClient();
        const { error: uploadError } = await supabase.storage.from("private-assets").uploadToSignedUrl(ticket.data.path, ticket.data.token, productFile, { contentType: productFile.type });
        if (uploadError) throw uploadError;
        const productResponse = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: product.name,
            category: product.category,
            price: product.price ? Number(product.price.replace(/,/g, "")) : null,
            facts: product.facts.split(",").map((value) => value.trim()).filter(Boolean),
            uploads: [{ path: ticket.data.path, mime: productFile.type, bytes: productFile.size }],
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
    setNotice("확인된 상품 정보로 카피 3종을 기획하고 있어요.");
    try {
      const response = await fetch("/api/creatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (!response.ok) throw new Error("CREATIVE_GENERATION_FAILED");
      const result = await response.json() as { data: { provider: "openai" | "demo"; variants: CreativeVariant[] } };
      const productReview = reviewCopy(product.facts);
      const next = presentVariants(result.data.variants).map((creative) => productReview.status === "차단" ? { ...creative, status: "차단" as const, finding: productReview.findings[0]?.message } : creative);
      const blocked = next.some((creative) => creative.status === "차단");
      setCreatives(next);
      setNotice(blocked
        ? "검토에서 차단 표현을 발견했어요. 문구를 수정해야 내보낼 수 있어요."
        : result.data.provider === "openai"
          ? "AI가 확인된 사실을 바탕으로 카피 3종을 만들었어요."
          : "데모 생성기로 카피 3종을 만들었어요. OpenAI 키를 설정하면 AI 기획을 사용합니다.");
    } catch {
      setNotice("카피 생성에 실패했어요. 잠시 뒤 다시 시도해주세요.");
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
    const productVisual = product.image ? `<defs><clipPath id="product-frame"><rect x="575" y="225" width="430" height="610" rx="54"/></clipPath></defs><image href="${escapeXml(product.image)}" x="575" y="225" width="430" height="610" preserveAspectRatio="xMidYMid meet" clip-path="url(#product-frame)"/>` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="1080" height="1080" fill="${creative.background}"/><circle cx="830" cy="520" r="285" fill="${creative.accent}" opacity=".12"/>${productVisual}<text x="84" y="190" font-family="Arial, sans-serif" font-size="42" fill="${creative.accent}">GROWTH TOOL / ${creative.id}</text><text x="84" y="390" font-family="Arial, sans-serif" font-size="88" font-weight="700" fill="${creative.accent}">${headline}</text><text x="84" y="690" font-family="Arial, sans-serif" font-size="38" fill="${creative.accent}">${escapeXml(creative.subline)}</text><rect x="84" y="814" width="286" height="86" rx="43" fill="${creative.accent}"/><text x="126" y="870" font-family="Arial, sans-serif" font-size="31" fill="#ffffff">${escapeXml(creative.cta)}</text><text x="84" y="990" font-family="Arial, sans-serif" font-size="24" fill="${creative.accent}">${escapeXml(product.name)} · 확인된 정보 기반 초안</text></svg>`;
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
      zip.file("scene.json", JSON.stringify({ canvas: { width: 1080, height: 1080, colorSpace: "sRGB" }, creative, product: { name: product.name, price: product.price }, exportId }, null, 2));
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

  function handleCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setCsvError("CSV는 5MB 이하 파일만 업로드할 수 있어요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseMetricsCsv(String(reader.result || ""));
      if (!result) {
        setCsvError("필수 열이 필요해요: impressions, link_clicks/clicks, spend.");
        return;
      }
      setCsvError("");
      setMetrics(result);
      setNotice("성과 데이터를 불러왔어요. 설정이 같은 행만 합산해 비교하세요.");
    };
    reader.readAsText(file);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Sparkles size={18} /></span><span>Growth tool</span></div>
        <nav aria-label="주요 메뉴">
          <button className={activeTab === "dashboard" ? "nav-item active" : "nav-item"} onClick={() => setActiveTab("dashboard")}><LayoutDashboard size={18} />오늘의 트렌드</button>
          <button className={activeTab === "studio" ? "nav-item active" : "nav-item"} onClick={() => setActiveTab("studio")}><Sparkles size={18} />크리에이티브 스튜디오</button>
          <button className={activeTab === "performance" ? "nav-item active" : "nav-item"} onClick={() => setActiveTab("performance")}><BarChart3 size={18} />성과 비교</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace"><span className="avatar">{(workspaceSummary?.brandName || "루미에르").slice(0, 1)}</span><div><strong>{workspaceSummary?.brandName || "루미에르"}</strong><small>{workspaceSummary?.category || "패션"} · PoC 워크스페이스</small></div></div>
          <div className="quota"><span>이번 주 생성량</span><strong>{workspaceSummary?.quotaUsed ?? 2} <small>/ 5 세트</small></strong><div className="progress"><i style={{ width: `${Math.min(100, ((workspaceSummary?.quotaUsed ?? 2) / 5) * 100)}%` }} /></div></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar"><div><p className="eyebrow">PERFORMANCE CREATIVE OS</p><h1>{activeTab === "dashboard" ? "오늘의 기회" : activeTab === "studio" ? "크리에이티브 스튜디오" : "내 광고 성과"}</h1></div>{persistenceEnabled ? <form action="/auth/logout" method="post"><button className="outline-button" type="submit"><LogOut size={16} />로그아웃</button></form> : <button className="outline-button" onClick={() => { localStorage.removeItem("growth-tool-state"); window.location.reload(); }}><Clock3 size={16} />데모 초기화</button>}</header>
        <div className="notice" role="status"><Sparkles size={16} />{notice}</div>

        {activeTab === "dashboard" && <Dashboard trends={trends} provider={trendProvider} freshness={trendFreshness} savedTrends={savedTrends} selectedTrend={selectedTrend} onSave={saveTrend} onSelect={setSelectedTrend} onStart={startStudio} />}
        {activeTab === "studio" && <Studio product={product} selectedTrend={selectedTrend} creatives={creatives} fileRef={fileRef} onProduct={setProduct} onImage={handleFile} onGenerate={generate} onEdit={setSelectedCreative} onExport={exportCreative} />}
        {activeTab === "performance" && <Performance metrics={metrics} performance={performance} error={csvError} onCsv={handleCsv} />}
      </section>

      {selectedCreative && <Editor creative={selectedCreative} product={product} onClose={() => setSelectedCreative(null)} onUpdate={updateCreative} onExport={exportCreative} />}
    </main>
  );
}

function Dashboard({ trends, provider, freshness, savedTrends, selectedTrend, onSave, onSelect, onStart }: { trends: Trend[]; provider: TrendFeed["provider"]; freshness: TrendFeed["freshness"]; savedTrends: string[]; selectedTrend?: Trend; onSave: (trend: Trend) => void; onSelect: (trend: Trend) => void; onStart: (trend?: Trend) => void }) {
  return <div className="dashboard-grid">
    <section className="hero-card"><div><p className="eyebrow">09.17 WED · FASHION & BEAUTY</p><h2>트렌드는 매일 바뀌고,<br />소재는 더 빨리 피로해집니다.</h2><p>오늘의 쇼핑 신호를 바로 A/B 테스트용 기획으로 바꾸세요.</p><ActionButton variant="brandSolid" className="seed-action" onClick={() => onStart(selectedTrend)}><Sparkles size={17} />{selectedTrend ? `“${selectedTrend.title}”로 제작` : "소재 만들기"}<ChevronRight size={17} /></ActionButton></div><div className="hero-orb"><Flame size={58} /><span>+{selectedTrend?.growth || 0}%<small>최근 3일 변화</small></span></div></section>
    <section className="signal-panel"><div className="section-heading"><div><p className="eyebrow">SHOPPING INSIGHT</p><h2>카테고리 신호</h2></div><span className="fresh"><span />{provider === "naver-shopping" ? freshness === "fresh" ? "네이버 API · 최신" : freshness === "delayed" ? "업데이트 지연" : "데이터 만료" : "데모 · API 키 대기"}</span></div><div className="signal-bars"><div><span>패션의류</span><i style={{ width: "88%" }} /><b>88</b></div><div><span>화장품/미용</span><i style={{ width: "64%" }} /><b>64</b></div><div><span>패션잡화</span><i style={{ width: "47%" }} /><b>47</b></div></div><p className="source-note">API 키를 설정하면 네이버 쇼핑 클릭 상대지수를 서버에서 불러옵니다. 조회 묶음끼리만 비교하세요.</p></section>
    <section className="trend-section"><div className="section-heading"><div><p className="eyebrow">CURATED FOR YOUR BRAND</p><h2>떠오르는 키워드</h2></div><button className="text-button"><Search size={16} />전체 탐색</button></div><div className="trend-list">{trends.map((trend) => <article className={selectedTrend?.id === trend.id ? "trend-card selected" : "trend-card"} key={trend.id} onClick={() => onSelect(trend)}><div className="trend-color" style={{ background: trend.color }}><TrendingUp size={19} /></div><div className="trend-copy"><div><span className="pill">{trend.category}</span><strong>{trend.title}</strong></div><p>{trend.description}</p><svg viewBox="0 0 100 42" aria-label={`${trend.title} 추이`}><path d={sparkPath(trend.values)} /></svg></div><div className="trend-meta"><b>+{trend.growth}%</b><small>추천 {trend.score}</small><button aria-label={`${trend.title} 저장`} className={savedTrends.includes(trend.id) ? "save-button saved" : "save-button"} onClick={(event) => { event.stopPropagation(); onSave(trend); }}>{savedTrends.includes(trend.id) ? <Check size={16} /> : <Plus size={16} />}</button></div></article>)}</div></section>
  </div>;
}

function Studio({ product, selectedTrend, creatives, fileRef, onProduct, onImage, onGenerate, onEdit, onExport }: { product: Product; selectedTrend?: Trend; creatives: Creative[]; fileRef: React.RefObject<HTMLInputElement | null>; onProduct: React.Dispatch<React.SetStateAction<Product>>; onImage: (event: ChangeEvent<HTMLInputElement>) => void; onGenerate: (event: FormEvent) => void; onEdit: (creative: Creative) => void; onExport: (creative: Creative) => void }) {
  return (
    <div className="studio-grid">
      <section className="brief-panel">
        <div className="section-heading"><div><p className="eyebrow">1. PRODUCT FACTS</p><h2>상품 정보</h2></div><span className="draft">자동 저장</span></div>
        <form onSubmit={onGenerate}>
          <label>상품명<input value={product.name} onChange={(event) => onProduct((current) => ({ ...current, name: event.target.value }))} placeholder="예: 루미에르 소프트 재킷" /></label>
          <label>세부 카테고리<input value={product.category} onChange={(event) => onProduct((current) => ({ ...current, category: event.target.value }))} placeholder="예: 여성 아우터" /></label>
          <label>확인된 가격 <small>선택</small><div className="price-field"><span>₩</span><input value={product.price} onChange={(event) => onProduct((current) => ({ ...current, price: event.target.value.replace(/[^0-9,]/g, "") }))} placeholder="129,000" /></div></label>
          <label>확인된 특징 <small>광고 카피에만 이 내용을 사용합니다</small><textarea value={product.facts} onChange={(event) => onProduct((current) => ({ ...current, facts: event.target.value }))} placeholder="소재, 색상, 핏 등 사실만 입력하세요" /></label>
          <input ref={fileRef} className="hidden-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={onImage} />
          <button type="button" className="upload-box" onClick={() => fileRef.current?.click()}>
            {product.image ? <NextImage src={product.image} alt="등록한 상품" width={600} height={400} unoptimized /> : <><ImagePlus size={22} /><span>제품 사진 추가</span><small>JPG, PNG, WebP · 최대 10MB</small></>}
          </button>
          <div className="trend-connection"><div><TrendingUp size={17} /><span>선택한 신호</span></div><strong>{selectedTrend?.title || "상품 중심 기획"}</strong><p>{selectedTrend ? `${selectedTrend.description} · 최근 3일 +${selectedTrend.growth}%` : "트렌드를 고르지 않아도 제작할 수 있어요."}</p></div>
          <ActionButton variant="brandSolid" className="seed-action wide" type="submit"><Sparkles size={17} />카피 비교 3종 만들기</ActionButton>
        </form>
      </section>
      <section className="creative-panel">
        <div className="section-heading"><div><p className="eyebrow">2. COPY TEST · 3 VARIANTS</p><h2>생성된 소재</h2></div><span className="status-dot"><span />완료</span></div>
        <p className="panel-intro">배경·제품 배치·가격·CTA는 고정하고 헤드라인만 비교합니다.</p>
        <div className="creative-grid">{creatives.map((creative) => (
          <article className="creative-card" key={creative.id}>
            <CreativePreview creative={creative} product={product} />
            <div className="creative-card-footer"><div><span className={`review ${creative.status === "통과" ? "pass" : creative.status === "차단" ? "block" : "warn"}`}>{creative.status === "통과" ? <ShieldCheck size={14} /> : <CircleAlert size={14} />}{creative.status}</span><strong>{creative.id}안</strong></div><div><button aria-label={`${creative.id}안 편집`} onClick={() => onEdit(creative)}><Pencil size={16} /></button><button aria-label={`${creative.id}안 내보내기`} onClick={() => onExport(creative)}><Download size={16} /></button></div></div>
            {creative.finding && <p className="finding"><CircleAlert size={14} />{creative.finding}</p>}
          </article>
        ))}</div>
        <div className="experiment-note"><BarChart3 size={18} /><div><strong>실험 메모</strong><p>A/B/C는 헤드라인만 다릅니다. 집행 시 동일 타깃·예산·기간으로 설정해야 비교할 수 있어요.</p></div></div>
      </section>
    </div>
  );
}

function CreativePreview({ creative, product }: { creative: Creative; product: Product }) {
  return <div className="creative-preview" style={{ background: creative.background, color: creative.accent }}><span className="variant-label">VARIANT {creative.id}</span><div className="preview-copy"><h3>{creative.headline.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</h3><p>{creative.subline}</p><b>{product.price ? `₩${product.price}` : ""}</b><button style={{ background: creative.accent }}>{creative.cta}</button></div><div className={product.image ? "product-visual has-image" : "product-visual"} style={{ borderColor: creative.accent }}><div className="jacket"><i /><i /><span /></div>{product.image && <NextImage src={product.image} alt="상품" width={500} height={600} unoptimized />}</div><small>{product.name}</small></div>;
}

function Editor({ creative, product, onClose, onUpdate, onExport }: { creative: Creative; product: Product; onClose: () => void; onUpdate: (key: keyof Creative, value: string) => void; onExport: (creative: Creative) => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="소재 편집"><div className="editor-modal"><header><div><p className="eyebrow">VARIANT {creative.id} · EDITOR</p><h2>텍스트 레이어 편집</h2></div><button onClick={onClose} aria-label="편집기 닫기"><X /></button></header><div className="editor-body"><CreativePreview creative={creative} product={product} /><div className="editor-controls"><label>헤드라인<textarea value={creative.headline} onChange={(e) => onUpdate("headline", e.target.value)} /></label><label>보조 문구<input value={creative.subline} onChange={(e) => onUpdate("subline", e.target.value)} /></label><label>CTA<input value={creative.cta} onChange={(e) => onUpdate("cta", e.target.value)} /></label><label>배경 색상<input type="color" value={creative.background} onChange={(e) => onUpdate("background", e.target.value)} /></label><div className={`policy-box ${creative.status === "차단" ? "blocked" : ""}`}>{creative.status === "통과" ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}<div><strong>{creative.status === "차단" ? "내보내기 차단" : "검토 가능"}</strong><p>{creative.finding || "편집 후 검토가 새로 적용됐어요."}</p></div></div><div className="editor-actions"><button className="outline-button" onClick={onClose}><Save size={16} />저장됨</button><ActionButton variant="brandSolid" className="seed-action" onClick={() => onExport(creative)}><ArrowDownToLine size={16} />내보내기</ActionButton></div></div></div></div></div>;
}

function Performance({ metrics, performance, error, onCsv }: { metrics: Metric | null; performance: { ctr: number | null; cpc: number | null; cvr: number | null; roas: number | null } | null; error: string; onCsv: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <div className="performance-page"><section className="performance-hero"><div><p className="eyebrow">3. MEASURE WHAT RAN</p><h2>내보낸 소재와<br />실측 성과를 연결하세요.</h2><p>표준 CSV를 올리면 광고 계정의 집계값을 계산합니다. 구매 데이터가 없으면 ROAS를 표시하지 않아요.</p></div><label className="primary-button file-button"><ArrowDownToLine size={17} />성과 CSV 업로드<input type="file" accept=".csv,text/csv" onChange={onCsv} /></label></section>{error && <div className="error-box"><CircleAlert size={17} />{error}</div>}{metrics && performance ? <><div className="metric-cards"><MetricCard label="노출" value={metricValue(metrics.impressions)} note="업로드된 광고 행 합계" /><MetricCard label="CTR" value={performance.ctr === null ? "계산 불가" : `${performance.ctr.toFixed(2)}%`} note="링크 클릭 ÷ 노출" /><MetricCard label="CPC" value={performance.cpc === null ? "계산 불가" : `₩${Math.round(performance.cpc).toLocaleString("ko-KR")}`} note="비용 ÷ 링크 클릭" /><MetricCard label="ROAS" value={performance.roas === null ? "구매 데이터 없음" : `${performance.roas.toFixed(2)}x`} note="구매 금액 ÷ 비용" /></div><section className="metrics-detail"><div className="section-heading"><div><p className="eyebrow">IMPORTED REPORT</p><h2>집계 세부값</h2></div><span className="status-dot"><span />사용자 업로드</span></div><dl><div><dt>링크 클릭</dt><dd>{metricValue(metrics.clicks)}</dd></div><div><dt>광고 비용</dt><dd>₩{metricValue(metrics.spend)}</dd></div><div><dt>구매</dt><dd>{metrics.purchases === undefined ? "데이터 없음" : metricValue(metrics.purchases)}</dd></div><div><dt>구매 금액</dt><dd>{metrics.revenue === undefined ? "데이터 없음" : `₩${metricValue(metrics.revenue)}`}</dd></div></dl><p className="source-note">서로 다른 통화, 타임존, 귀속 설정의 보고서는 합산하면 안 됩니다. 이 데모는 업로드된 한 설정 묶음만 계산합니다.</p></section></> : <section className="empty-performance"><BarChart3 size={34} /><h3>아직 성과 데이터가 없어요</h3><p><code>impressions, link_clicks, spend</code> 열이 있는 CSV를 업로드하세요. <code>purchases, purchase_value</code>는 선택입니다.</p></section>}</div>;
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
