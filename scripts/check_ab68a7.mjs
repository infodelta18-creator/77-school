import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://htzongxcyrpmgmijyusp.supabase.co";
const supabaseAnonKey = "sb_publishable_hpLOls3Nj890yw3FyqsTGA_zNaFIcYp";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const shortCode = "ab68a7";
  const minUuid = `${shortCode.padEnd(8, "0")}-0000-0000-0000-000000000000`;
  const maxUuid = `${shortCode.padEnd(8, "f")}-ffff-ffff-ffff-ffffffffffff`;

  const { data: msgs, error } = await supabase
    .from("contact_messages")
    .select("id, full_name, subject, status, admin_reply, created_at")
    .gte("id", minUuid)
    .lte("id", maxUuid);

  console.log("=== MSG-2026-AB68A7 IN DATABASE ===");
  console.log("Error:", error?.message || null);
  console.log("Found rows:", JSON.stringify(msgs, null, 2));
}

check();
