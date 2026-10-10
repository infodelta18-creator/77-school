import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://htzongxcyrpmgmijyusp.supabase.co";
const supabaseAnonKey = "sb_publishable_hpLOls3Nj890yw3FyqsTGA_zNaFIcYp";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: recs, error: err1 } = await supabase
    .from("reception_requests")
    .select("id, request_number, full_name, subject, created_at")
    .order("created_at", { ascending: false });

  const { data: msgs, error: err2 } = await supabase
    .from("contact_messages")
    .select("id, full_name, subject, created_at")
    .order("created_at", { ascending: false });

  console.log("=== VIRTUAL QABULXONA (reception_requests) ===");
  console.log("Count:", recs?.length ?? 0, "Error:", err1?.message ?? null);
  if (recs) {
    recs.forEach((r, i) => console.log(`${i + 1}. [${r.id}] ${r.request_number} - ${r.full_name} (${r.created_at})`));
  }

  console.log("\n=== ALOQA MUROJAATLARI (contact_messages) ===");
  console.log("Count:", msgs?.length ?? 0, "Error:", err2?.message ?? null);
  if (msgs) {
    msgs.forEach((m, i) => console.log(`${i + 1}. [${m.id}] ${m.full_name}: ${m.subject} (${m.created_at})`));
  }
}

check();
