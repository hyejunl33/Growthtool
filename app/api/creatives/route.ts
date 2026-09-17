import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { creativeRequestSchema, generateCreativeVariants } from "../../../lib/creative";
import { hasSupabaseConfig } from "../../../lib/supabase/config";
import { createClient } from "../../../lib/supabase/server";
import { getCurrentWorkspace } from "../../../lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let persistence: { supabase: Awaited<ReturnType<typeof createClient>>; workspaceId: string; jobId: string } | undefined;
  const parsed = creativeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_CREATIVE_INPUT", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  if (process.env.OPENAI_API_KEY && !hasSupabaseConfig() && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "AUTH_REQUIRED_FOR_AI" }, { status: 503 });
  }

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (!parsed.data.productVersionId || !parsed.data.idempotencyKey) {
      return NextResponse.json({ error: "PERSISTENCE_IDS_REQUIRED" }, { status: 400 });
    }
    const workspaceId = await getCurrentWorkspace(supabase, data.user.id);
    if (!workspaceId) return NextResponse.json({ error: "WORKSPACE_NOT_FOUND" }, { status: 404 });
    const inputHash = createHash("sha256").update(JSON.stringify({ product: parsed.data.product, trend: parsed.data.trend })).digest("hex");
    const { data: jobId, error } = await supabase.rpc("reserve_generation", {
      target_workspace_id: workspaceId,
      target_product_version_id: parsed.data.productVersionId,
      requested_idempotency_key: parsed.data.idempotencyKey,
      requested_input_hash: inputHash,
      requested_prompt_version: "creative-copy-v1",
    });
    if (error || typeof jobId !== "string") {
      const quotaExceeded = error?.message.includes("WEEKLY_QUOTA_EXCEEDED");
      return NextResponse.json({ error: quotaExceeded ? "WEEKLY_QUOTA_EXCEEDED" : "GENERATION_RESERVATION_FAILED" }, { status: quotaExceeded ? 429 : 400 });
    }
    persistence = { supabase, workspaceId, jobId };
  }

  try {
    const data = await generateCreativeVariants(parsed.data);
    let creativeSetId: string | undefined;
    if (persistence) {
      const { data: storedId, error } = await persistence.supabase.rpc("complete_generation", {
        target_job_id: persistence.jobId,
        result_provider: data.provider,
        result_model: data.model,
        result_trend: parsed.data.trend || null,
        result_variants: data.variants,
      });
      if (error || typeof storedId !== "string") throw new Error("GENERATION_PERSIST_FAILED");
      creativeSetId = storedId;
    }
    return NextResponse.json({ data: { ...data, jobId: persistence?.jobId, creativeSetId } });
  } catch (error) {
    console.error("creative generation failed", error);
    if (persistence) {
      await persistence.supabase.from("generation_jobs").update({ status: "failed", error_code: "CREATIVE_GENERATION_FAILED", completed_at: new Date().toISOString() }).eq("id", persistence.jobId).eq("workspace_id", persistence.workspaceId);
    }
    const code = error instanceof Error && error.message === "OPENAI_NOT_CONFIGURED" ? "OPENAI_NOT_CONFIGURED" : "CREATIVE_GENERATION_FAILED";
    return NextResponse.json({ error: code }, { status: code === "OPENAI_NOT_CONFIGURED" ? 503 : 502 });
  }
}
