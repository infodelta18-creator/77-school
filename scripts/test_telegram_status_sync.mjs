import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://htzongxcyrpmgmijyusp.supabase.co";
const supabaseAnonKey = "sb_publishable_hpLOls3Nj890yw3FyqsTGA_zNaFIcYp";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStatusSync() {
  console.log("=== TESTING TELEGRAM BOT STATUS SYNC WITH WEBSITE ===");

  // 1. Get most recent VR request
  const { data: vrList } = await supabase
    .from("reception_requests")
    .select("id, request_number, status, admin_reply")
    .order("created_at", { ascending: false })
    .limit(1);

  if (vrList && vrList.length > 0) {
    const vr = vrList[0];
    console.log(`\nFound VR Request: ${vr.request_number} (Current status: "${vr.status}")`);

    // Simulate Admin clicking "🔴 Rad etildi" in Telegram (which updates DB status to 'rejected')
    console.log("Simulating Telegram click -> setting status = 'rejected'...");
    const { error: err1 } = await supabase
      .from("reception_requests")
      .update({ status: "rejected", admin_reply: "Taqdim etilgan hujjatlar yetarli emas deb topildi." })
      .eq("id", vr.id);

    if (err1) console.error("Error updating VR status:", err1.message);
    else console.log("✅ VR status successfully updated to 'rejected' in Supabase!");

    // Verify DB update
    const { data: updatedVr } = await supabase
      .from("reception_requests")
      .select("request_number, status, admin_reply")
      .eq("id", vr.id)
      .single();

    console.log("DB Value after Telegram click:", updatedVr);
  }

  // 2. Get most recent MSG request
  const { data: msgList } = await supabase
    .from("contact_messages")
    .select("id, status, admin_reply")
    .order("created_at", { ascending: false })
    .limit(1);

  if (msgList && msgList.length > 0) {
    const msg = msgList[0];
    const code = `MSG-2026-${msg.id.slice(0, 6).toUpperCase()}`;
    console.log(`\nFound MSG Request: ${code} (Current status: "${msg.status}")`);

    // Simulate Admin clicking "✅ Yakunlandi" in Telegram (which updates DB status to 'completed')
    console.log("Simulating Telegram click -> setting status = 'completed'...");
    const { error: err2 } = await supabase
      .from("contact_messages")
      .update({ status: "completed", admin_reply: "Murojaat ijobiy hal etildi va yakunlandi." })
      .eq("id", msg.id);

    if (err2) console.error("Error updating MSG status:", err2.message);
    else console.log("✅ MSG status successfully updated to 'completed' in Supabase!");

    // Verify DB update
    const { data: updatedMsg } = await supabase
      .from("contact_messages")
      .select("id, status, admin_reply")
      .eq("id", msg.id)
      .single();

    console.log("DB Value after Telegram click:", updatedMsg);
  }
}

testStatusSync();
