import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://htzongxcyrpmgmijyusp.supabase.co";
const supabaseAnonKey = "sb_publishable_hpLOls3Nj890yw3FyqsTGA_zNaFIcYp";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

async function smartSearch(inputCode) {
  const cleanCode = inputCode.trim().toUpperCase();
  // Extract trailing code part e.g. MSG-2026-565208 -> 565208
  const digitsOrHex = cleanCode.replace(/^(VR|MSG)-2026-/i, "").toLowerCase();

  console.log(`\n=== SMART SEARCH: "${inputCode}" (Clean: "${cleanCode}", Part: "${digitsOrHex}") ===`);

  // 1. Try reception_requests by exact or ilike VR-2026-PART or PART
  if (isUUID(cleanCode)) {
    const { data: recUuid } = await supabase
      .from("reception_requests")
      .select("id, request_number, full_name, subject, status, admin_reply, created_at")
      .eq("id", cleanCode)
      .maybeSingle();
    if (recUuid) {
      console.log("Found in reception_requests by UUID:", recUuid.request_number);
      return recUuid;
    }
  }

  // Search reception_requests by request_number
  const vrPattern = cleanCode.startsWith("VR") ? cleanCode : `%${digitsOrHex}%`;
  const { data: recData } = await supabase
    .from("reception_requests")
    .select("id, request_number, full_name, subject, status, admin_reply, created_at")
    .ilike("request_number", vrPattern)
    .limit(1);

  if (recData && recData.length > 0) {
    console.log("Found in reception_requests by pattern:", recData[0].request_number);
    return recData[0];
  }

  // 2. Try contact_messages by UUID or shortCode prefix
  if (isUUID(cleanCode)) {
    const { data: msgUuid } = await supabase
      .from("contact_messages")
      .select("id, full_name, subject, status, admin_reply, created_at")
      .eq("id", cleanCode)
      .maybeSingle();
    if (msgUuid) {
      console.log("Found in contact_messages by UUID:", msgUuid.id);
      return msgUuid;
    }
  }

  if (digitsOrHex.length >= 3) {
    // Try range search if valid hex prefix
    if (/^[0-9a-f]+$/i.test(digitsOrHex)) {
      const minUuid = `${digitsOrHex.padEnd(8, "0")}-0000-0000-0000-000000000000`;
      const maxUuid = `${digitsOrHex.padEnd(8, "f")}-ffff-ffff-ffff-ffffffffffff`;

      const { data: msgRange } = await supabase
        .from("contact_messages")
        .select("id, full_name, subject, status, admin_reply, created_at")
        .gte("id", minUuid)
        .lte("id", maxUuid)
        .limit(1);

      if (msgRange && msgRange.length > 0) {
        console.log("Found in contact_messages by range:", msgRange[0].id);
        return msgRange[0];
      }
    }

    // JS Fallback
    const { data: recentMsgs } = await supabase
      .from("contact_messages")
      .select("id, full_name, subject, status, admin_reply, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    const match = recentMsgs?.find((m) => m.id.toLowerCase().startsWith(digitsOrHex));
    if (match) {
      console.log("Found in contact_messages by JS fallback:", match.id);
      return match;
    }
  }

  console.log("NOT FOUND!");
  return null;
}

async function run() {
  await smartSearch("MSG-2026-565208"); // User typed MSG instead of VR
  await smartSearch("VR-2026-890706");
  await smartSearch("MSG-2026-16D4AE");
  await smartSearch("890706");
}

run();
