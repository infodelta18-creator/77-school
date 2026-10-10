import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://htzongxcyrpmgmijyusp.supabase.co";
const supabaseAnonKey = "sb_publishable_hpLOls3Nj890yw3FyqsTGA_zNaFIcYp";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function trim() {
  // 1. reception_requests
  const { data: recs, error: recErr } = await supabase
    .from("reception_requests")
    .select("id, created_at")
    .order("created_at", { ascending: false });

  if (recErr) {
    console.error("Error fetching reception_requests:", recErr);
    return;
  }

  if (recs && recs.length > 2) {
    const idsToDelete = recs.slice(2).map((r) => r.id);
    console.log(`Deleting ${idsToDelete.length} old reception_requests...`);
    const { error: delRecErr } = await supabase
      .from("reception_requests")
      .delete()
      .in("id", idsToDelete);

    if (delRecErr) {
      console.error("Error deleting reception_requests:", delRecErr);
    } else {
      console.log(`Successfully deleted ${idsToDelete.length} old reception_requests. 2 remain.`);
    }
  } else {
    console.log(`reception_requests has ${recs?.length ?? 0} rows. No deletion needed.`);
  }

  // 2. contact_messages
  const { data: msgs, error: msgErr } = await supabase
    .from("contact_messages")
    .select("id, created_at")
    .order("created_at", { ascending: false });

  if (msgErr) {
    console.error("Error fetching contact_messages:", msgErr);
    return;
  }

  if (msgs && msgs.length > 2) {
    const idsToDelete = msgs.slice(2).map((m) => m.id);
    console.log(`Deleting ${idsToDelete.length} old contact_messages...`);
    const { error: delMsgErr } = await supabase
      .from("contact_messages")
      .delete()
      .in("id", idsToDelete);

    if (delMsgErr) {
      console.error("Error deleting contact_messages:", delMsgErr);
    } else {
      console.log(`Successfully deleted ${idsToDelete.length} old contact_messages. 2 remain.`);
    }
  } else {
    console.log(`contact_messages has ${msgs?.length ?? 0} rows. No deletion needed.`);
  }
}

trim();
