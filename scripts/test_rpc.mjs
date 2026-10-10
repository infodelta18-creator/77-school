import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://htzongxcyrpmgmijyusp.supabase.co";
const supabaseAnonKey = "sb_publishable_hpLOls3Nj890yw3FyqsTGA_zNaFIcYp";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRpc() {
  console.log("Calling RPC get_murojaat_status('MSG-2026-AB68A7')...");
  const { data, error } = await supabase.rpc("get_murojaat_status", {
    p_code: "MSG-2026-AB68A7",
  });

  console.log("RPC Error:", error?.message || null);
  console.log("RPC Data:", data);
}

testRpc();
