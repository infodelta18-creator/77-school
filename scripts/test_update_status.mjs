import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://htzongxcyrpmgmijyusp.supabase.co";
const supabaseAnonKey = "sb_publishable_hpLOls3Nj890yw3FyqsTGA_zNaFIcYp";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdate() {
  console.log("Updating MSG-2026-AB68A7 status to 'in_progress'...");
  const { error } = await supabase
    .from("contact_messages")
    .update({ status: "in_progress" })
    .eq("id", "ab68a7a8-5d89-47ff-a9d4-7707ecc14b18");

  console.log("Update error:", error?.message || null);

  const { data } = await supabase.rpc("get_murojaat_status", {
    p_code: "MSG-2026-AB68A7",
  });

  console.log("RPC Data after update:", data);
}

testUpdate();
