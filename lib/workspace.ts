import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCurrentWorkspace(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.workspace_id as string | undefined;
}
