import GrowthTool from "./growth-tool";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "../lib/supabase/config";
import { createClient } from "../lib/supabase/server";
import { getCurrentWorkspace } from "../lib/workspace";
import { hasJudgeAccessConfigured } from "../lib/judge-access";

export default async function Home() {
  let workspaceSummary: { brandName: string; category: string; quotaUsed: number } | undefined;
  const judgeMode = hasJudgeAccessConfigured();
  if (hasSupabaseConfig() && !judgeMode) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
    const workspaceId = await getCurrentWorkspace(supabase, data.user.id);
    if (!workspaceId) throw new Error("WORKSPACE_NOT_FOUND");
    const [{ data: brand }, { data: quotaUsed }] = await Promise.all([
      supabase.from("brands").select("name,category,onboarding_completed_at").eq("workspace_id", workspaceId).single(),
      supabase.rpc("get_weekly_generation_usage", { target_workspace_id: workspaceId }),
    ]);
    if (!brand?.onboarding_completed_at) redirect("/onboarding");
    workspaceSummary = { brandName: brand.name, category: brand.category, quotaUsed: typeof quotaUsed === "number" ? quotaUsed : 0 };
  }
  return <GrowthTool persistenceEnabled={hasSupabaseConfig() && !judgeMode} judgeMode={judgeMode} workspaceSummary={workspaceSummary} />;
}
