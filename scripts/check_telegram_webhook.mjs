const botToken = "8898678135:AAGmMQHio6ZdWmlEqlJ7RaPA4aztJ5TBa58";

async function checkWebhook() {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const data = await res.json();
  console.log("=== TELEGRAM WEBHOOK INFO ===");
  console.log(JSON.stringify(data, null, 2));
}

checkWebhook();
