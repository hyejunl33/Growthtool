import GrowthTool from "./growth-tool";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "../lib/supabase/config";
import { createClient } from "../lib/supabase/server";

export default async function Home() {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
  }
  return <GrowthTool />;
}
