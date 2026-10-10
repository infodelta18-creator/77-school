const webhookUrl = "https://htzongxcyrpmgmijyusp.supabase.co/functions/v1/telegram-webhook";

async function testEndpoint() {
  console.log("Testing POST to telegram-webhook...");
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ test: true }),
  });

  console.log("Status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Response body:", text);
}

testEndpoint();
