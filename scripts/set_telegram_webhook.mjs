const botToken = "8898678135:AAGmMQHio6ZdWmlEqlJ7RaPA4aztJ5TBa58";
const webhookUrl = "https://htzongxcyrpmgmijyusp.supabase.co/functions/v1/telegram-webhook";

async function setWebhook() {
  console.log(`Setting Telegram bot webhook to: ${webhookUrl}`);
  const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"],
    }),
  });

  const data = await res.json();
  console.log("setWebhook Result:", JSON.stringify(data, null, 2));

  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const infoData = await infoRes.json();
  console.log("getWebhookInfo Result:", JSON.stringify(infoData, null, 2));
}

setWebhook();
