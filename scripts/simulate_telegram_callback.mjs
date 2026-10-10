const webhookUrl = "https://htzongxcyrpmgmijyusp.supabase.co/functions/v1/telegram-webhook";

async function simulateCallback() {
  const payload = {
    update_id: 123456789,
    callback_query: {
      id: "cb_9999",
      from: { id: 717, first_name: "Nodirbek", username: "Nodirbek_717" },
      message: {
        message_id: 100,
        chat: { id: -1004389776857 },
        text: "📩 Yangi bog'lanish murojaati\n📌 Murojaat kodi: MSG-2026-AB68A7\n🔑 ID: ab68a7a8-5d89-47ff-a9d4-7707ecc14b18",
      },
      data: "status:MSG:in_progress:ab68a7a8-5d89-47ff-a9d4-7707ecc14b18",
    },
  };

  console.log("Sending callback query payload to webhook...");
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("Status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Response body:", text);
}

simulateCallback();
