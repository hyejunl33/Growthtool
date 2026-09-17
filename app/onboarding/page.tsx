import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "../../lib/supabase/config";
import { createClient } from "../../lib/supabase/server";
import { getCurrentWorkspace } from "../../lib/workspace";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const workspaceId = await getCurrentWorkspace(supabase, auth.user.id);
  if (!workspaceId) throw new Error("WORKSPACE_NOT_FOUND");
  const { data: brand } = await supabase.from("brands").select("name,onboarding_completed_at").eq("workspace_id", workspaceId).single();
  if (brand?.onboarding_completed_at) redirect("/");
  return <OnboardingForm initialName={brand?.name || ""} />;
}
