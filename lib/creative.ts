import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const productInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().max(80).default(""),
  price: z.string().trim().max(40).default(""),
  facts: z.string().trim().min(1).max(1_500),
});

export const trendInputSchema = z.object({
  title: z.string().trim().min(1).max(100),
  category: z.string().trim().max(80),
  description: z.string().trim().max(500),
  observedAt: z.string().trim().max(40).optional(),
}).nullable().optional();

export const creativeRequestSchema = z.object({
  product: productInputSchema,
  trend: trendInputSchema,
  productVersionId: z.string().uuid().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export const creativeVariantSchema = z.object({
  id: z.enum(["A", "B", "C"]),
  headline: z.string().trim().min(1).max(80),
  subline: z.string().trim().min(1).max(120),
  cta: z.string().trim().min(1).max(30),
  trendReason: z.string().trim().min(1).max(200),
});

const creativeOutputSchema = z.object({
  variants: z.array(creativeVariantSchema).length(3),
});

export type CreativeRequest = z.infer<typeof creativeRequestSchema>;
export type CreativeVariant = z.infer<typeof creativeVariantSchema>;
export type CreativeProvider = "openai" | "demo";

function firstFact(facts: string) {
  return facts.split(",")[0]?.trim() || "확인된 상품 특징";
}

export function createFallbackVariants(input: CreativeRequest): CreativeVariant[] {
  const name = input.product.name;
  const fact = firstFact(input.product.facts);
  const trendName = input.trend?.title || "상품의 강점";
  const trendReason = input.trend
    ? `${input.trend.title} 탐색 신호와 확인된 상품 특징을 연결한 가설입니다.`
    : "선택한 트렌드 없이 확인된 상품 특징만 사용했습니다.";

  return [
    { id: "A", headline: `${name}\n매일 더 가볍게`, subline: fact, cta: "지금 만나보기", trendReason: "상품명을 중심으로 한 기본 카피입니다." },
    { id: "B", headline: `${trendName}에\n자연스럽게 어울리는`, subline: `${name} · ${fact}`, cta: "스타일 보기", trendReason },
    { id: "C", headline: "오늘의 룩을\n단정하게 완성", subline: fact, cta: "컬렉션 보기", trendReason },
  ];
}

function hasExactlyOneOfEachVariant(variants: CreativeVariant[]) {
  return variants.map((variant) => variant.id).sort().join("") === "ABC";
}

export async function generateCreativeVariants(input: CreativeRequest): Promise<{
  provider: CreativeProvider;
  model: string;
  promptVersion: string;
  variants: CreativeVariant[];
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_TEXT_MODEL || "gpt-5.6-luna";
  const promptVersion = "creative-copy-v1";

  if (!apiKey) {
    return { provider: "demo", model: "deterministic", promptVersion, variants: createFallbackVariants(input) };
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model,
    store: false,
    instructions: [
      "당신은 한국 패션·뷰티 D2C 광고 카피라이터다.",
      "사용자가 확인한 상품 사실만 주장으로 사용한다. 효능, 순위, 보장, 할인, 희소성은 입력에 명시되지 않으면 만들지 않는다.",
      "트렌드는 관심 신호이자 기획 가설로만 사용하고 상품 사실처럼 단정하지 않는다.",
      "A는 상품 중심, B는 트렌드 연결, C는 사용 장면 중심으로 서로 다른 헤드라인을 만든다.",
      "headline에는 자연스러운 위치에 줄바꿈 문자 하나를 넣을 수 있다. 모든 문구는 한국어로 간결하게 작성한다.",
      "trendReason에는 해당 안에서 트렌드를 사용한 이유 또는 사용하지 않은 이유를 쓴다.",
    ].join("\n"),
    input: JSON.stringify(input),
    text: { format: zodTextFormat(creativeOutputSchema, "creative_variants") },
  });

  if (!response.output_parsed || !hasExactlyOneOfEachVariant(response.output_parsed.variants)) {
    throw new Error("CREATIVE_OUTPUT_INVALID");
  }

  return { provider: "openai", model, promptVersion, variants: response.output_parsed.variants };
}
