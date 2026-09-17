import GrowthTool from "./growth-tool";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "../lib/supabase/config";
import { createClient } from "../lib/supabase/server";
import { getCurrentWorkspace } from "../lib/workspace";

export default async function Home() {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
    const workspaceId = await getCurrentWorkspace(supabase, data.user.id);
    if (!workspaceId) throw new Error("WORKSPACE_NOT_FOUND");
    const { data: brand } = await supabase.from("brands").select("onboarding_completed_at").eq("workspace_id", workspaceId).single();
    if (!brand?.onboarding_completed_at) redirect("/onboarding");
  }
  return <GrowthTool />;
}
