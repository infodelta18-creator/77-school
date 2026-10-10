import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const STATUS_LABELS: Record<string, string> = {
  accepted: "🟢 Qabul qilindi",
  qabul_qilindi: "🟢 Qabul qilindi",
  in_progress: "🟡 Ko'rib chiqilmoqda",
  korib_chiqilmoqda: "🟡 Ko'rib chiqilmoqda",
  completed: "✅ Yakunlandi",
  yakunlandi: "✅ Yakunlandi",
  rejected: "🔴 Rad etildi",
  rad_etildi: "🔴 Rad etildi",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const update = await req.json();

    // 1. Handle Inline Keyboard Button Click (Callback Query)
    if (update.callback_query) {
      const callback = update.callback_query;
      const data: string = callback.data || "";
      const chatId = callback.message?.chat?.id;
      const messageId = callback.message?.message_id;

      // Format: status:VR:accepted:<id> or status:MSG:completed:<id>
      if (data.startsWith("status:")) {
        const parts = data.split(":");
        const targetType = parts[1]; // VR or MSG
        const newStatus = parts[2]; // accepted, in_progress, completed
        const recordId = parts[3];

        const tableName = targetType === "VR" ? "reception_requests" : "contact_messages";
        
        // Update database status
        const { error: updateError } = await admin
          .from(tableName)
          .update({ status: newStatus })
          .eq("id", recordId);

        if (!updateError && TELEGRAM_BOT_TOKEN && chatId && messageId) {
          const statusText = STATUS_LABELS[newStatus] || newStatus;
          
          // Answer callback query
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: callback.id,
              text: `Status o'zgardi: ${statusText}`,
            }),
          });

          // Update Telegram message caption/text to append new status
          const currentText = callback.message.text || callback.message.caption || "";
          const updatedText = `${currentText}\n\n-------------------\n🔄 YANGILANGAN STATUS: ${statusText}`;

          const isPhotoOrDoc = Boolean(callback.message.photo || callback.message.document);
          const endpoint = isPhotoOrDoc ? "editMessageCaption" : "editMessageText";

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              [isPhotoOrDoc ? "caption" : "text"]: updatedText,
              reply_markup: callback.message.reply_markup,
            }),
          });
        }
      }

      return jsonResponse(200, { ok: true });
    }

    // 2. Handle Admin Text Reply in Telegram (message reply_to_message)
    if (update.message && update.message.reply_to_message) {
      const msg = update.message;
      const replyText = msg.text || "";
      const originalText = msg.reply_to_message.text || msg.reply_to_message.caption || "";
      const chatId = msg.chat?.id;

      // Extract ID from original Telegram message (e.g., ID: uuid or Murojaat ID: uuid)
      const idMatch = originalText.match(/(?:ID|Murojaat ID):\s*([a-f0-9-]{36})/i);
      
      if (idMatch && idMatch[1]) {
        const recordId = idMatch[1];
        const isVR = originalText.includes("virtual qabulxona") || originalText.includes("VR-");
        const tableName = isVR ? "reception_requests" : "contact_messages";

        // Save admin reply to database
        const { error: replyError } = await admin
          .from(tableName)
          .update({ admin_reply: replyText })
          .eq("id", recordId);

        if (!replyError && TELEGRAM_BOT_TOKEN && chatId) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              reply_to_message_id: msg.message_id,
              text: `✅ Admin javobi saqlandi!\n\n💬 Javob: "${replyText}"\n\nMurojaatchi saytda o'z kodi orqali ushbu javobni ko'radi.`,
            }),
          });
        }
      }

      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(200, { ok: true, message: "No action needed" });
  } catch (error) {
    console.error("telegram-webhook error", error);
    return jsonResponse(500, { ok: false, error: "webhook_error" });
  }
});
