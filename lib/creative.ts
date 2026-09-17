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
export type CreativeProvider = "openai";

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

  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");

  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model,
    store: false,
    instructions: [
      "당신은 한국 뷰티 D2C 광고 카피라이터다.",
      "사용자가 확인한 상품 사실만 주장으로 사용한다. 효능, 순위, 보장, 할인, 희소성은 입력에 명시되지 않으면 만들지 않는다.",
      "트렌드는 관심 신호이자 기획 가설로만 사용하고 상품 사실처럼 단정하지 않는다.",
      "A는 상품 중심, B는 트렌드 연결, C는 사용 장면 중심으로 서로 다른 헤드라인을 만든다.",
      "공정한 카피 비교를 위해 세 안의 supporting copy와 CTA는 완전히 같은 문자열로 작성한다.",
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
