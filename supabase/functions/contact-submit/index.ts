import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SubmitPayload = {
  action?: unknown;
  check_code?: unknown;
  full_name?: unknown;
  phone?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  website?: unknown;
};

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: origin ? "Origin" : "*",
  } as const;
}

function jsonResponse(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(origin),
  });
}

function toTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function clipForTelegram(value: string, max = 1200) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}...`;
}

function formatTashkentDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const day = getPart("day");
  const month = getPart("month");
  const year = getPart("year");
  const hour = getPart("hour");
  const minute = getPart("minute");

  if (!day || !month || !year || !hour || !minute) {
    return value;
  }

  return `${day}.${month}.${year} ${hour}:${minute}`;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, message: "Method not allowed" }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { ok: false, message: "Database configuration missing" }, origin);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Check for status search request via URL query
  const url = new URL(request.url);
  const checkCodeParam = url.searchParams.get("check_code") || url.searchParams.get("code");

  if (checkCodeParam) {
    const cleanCode = checkCodeParam.trim();
    const shortCode = cleanCode.replace(/^MSG-2026-/i, "").toLowerCase();

    const { data: msgData } = await admin
      .from("contact_messages")
      .select("id, full_name, subject, status, admin_reply, created_at")
      .or(`id.eq.${cleanCode},id.ilike.${shortCode}%`)
      .maybeSingle();

    if (msgData) {
      const ticketNumber = `MSG-2026-${msgData.id.slice(0, 6).toUpperCase()}`;
      return jsonResponse(
        200,
        {
          ok: true,
          found: true,
          code: ticketNumber,
          type_label: "Bog'lanish Xabari",
          full_name: msgData.full_name,
          subject: msgData.subject || "Murojaat",
          status: msgData.status || "accepted",
          admin_reply: msgData.admin_reply || null,
          created_at: msgData.created_at,
        },
        origin,
      );
    }
  }

  let payload: SubmitPayload = {};
  try {
    payload = (await request.json()) as SubmitPayload;
  } catch {
    return jsonResponse(400, { ok: false, message: "So'rov formati noto'g'ri." }, origin);
  }

  if (payload.action === "check" || payload.check_code) {
    const targetCode = toTrimmedString(payload.check_code || payload.action);
    const shortCode = targetCode.replace(/^MSG-2026-/i, "").toLowerCase();

    const { data: msgData } = await admin
      .from("contact_messages")
      .select("id, full_name, subject, status, admin_reply, created_at")
      .or(`id.eq.${targetCode},id.ilike.${shortCode}%`)
      .maybeSingle();

    if (msgData) {
      const ticketNumber = `MSG-2026-${msgData.id.slice(0, 6).toUpperCase()}`;
      return jsonResponse(
        200,
        {
          ok: true,
          found: true,
          code: ticketNumber,
          type_label: "Bog'lanish Xabari",
          full_name: msgData.full_name,
          subject: msgData.subject || "Murojaat",
          status: msgData.status || "accepted",
          admin_reply: msgData.admin_reply || null,
          created_at: msgData.created_at,
        },
        origin,
      );
    }
    return jsonResponse(200, { ok: true, found: false }, origin);
  }

  const fullName = toTrimmedString(payload.full_name);
  const phone = toTrimmedString(payload.phone);
  const email = toTrimmedString(payload.email);
  const subject = toTrimmedString(payload.subject);
  const message = toTrimmedString(payload.message);
  const website = toTrimmedString(payload.website);

  if (website) {
    return jsonResponse(200, { ok: true, message: "Xabar yuborildi." }, origin);
  }

  if (!fullName || !phone || !message) {
    return jsonResponse(400, { ok: false, message: "Iltimos, barcha majburiy maydonlarni to'ldiring." }, origin);
  }

  const { data: inserted, error: insertError } = await admin
    .from("contact_messages")
    .insert({
      full_name: fullName,
      phone,
      email,
      subject: subject || "Umumiy murojaat",
      message,
      status: "accepted",
    })
    .select("id, created_at")
    .single();

  if (insertError || !inserted) {
    return jsonResponse(500, { ok: false, message: "Xabarni yuborib bo'lmadi." }, origin);
  }

  const submissionId = inserted.id;
  const ticketNumber = `MSG-2026-${submissionId.slice(0, 6).toUpperCase()}`;

  let telegramNotified = false;
  const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (telegramBotToken && telegramChatId) {
    const createdAt = formatTashkentDateTime(inserted.created_at);
    const telegramText = [
      "📩 Yangi bog'lanish murojaati",
      "",
      `📌 Murojaat kodi: ${ticketNumber}`,
      `👤 F.I.Sh.: ${clipForTelegram(fullName, 150)}`,
      `📞 Telefon: ${clipForTelegram(phone, 80)}`,
      `✉️ Email: ${clipForTelegram(email || "Yo'q", 254)}`,
      `📝 Mavzu: ${clipForTelegram(subject || "Umumiy", 200)}`,
      "",
      "📄 Xabar:",
      clipForTelegram(message, 1800),
      "",
      `📅 Sana: ${createdAt}`,
      `🔑 ID: ${submissionId}`,
    ].join("\n");

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "🟢 Qabul qilindi", callback_data: `status:MSG:accepted:${submissionId}` },
          { text: "🟡 Ko'rib chiqilmoqda", callback_data: `status:MSG:in_progress:${submissionId}` },
        ],
        [
          { text: "✅ Yakunlandi", callback_data: `status:MSG:completed:${submissionId}` },
          { text: "🔴 Rad etildi", callback_data: `status:MSG:rejected:${submissionId}` },
        ],
      ],
    };

    try {
      const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: telegramText,
          disable_web_page_preview: true,
          reply_markup: inlineKeyboard,
        }),
      });

      if (telegramResponse.ok) {
        telegramNotified = true;
      }
    } catch {
      console.error("contact-submit telegram request failed");
    }
  }

  return jsonResponse(
    200,
    {
      ok: true,
      submission_id: submissionId,
      ticket_number: ticketNumber,
      telegram_notified: telegramNotified,
    },
    origin,
  );
});
