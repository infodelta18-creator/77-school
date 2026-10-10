import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SubmitPayload = {
  action?: unknown;
  check_code?: unknown;
  full_name?: unknown;
  phone?: unknown;
  email?: unknown;
  request_type?: unknown;
  subject?: unknown;
  message?: unknown;
  consent?: unknown;
  website?: unknown;
  attachment?: unknown;
};

const MAX_BODY_BYTES = 64 * 1024;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const RECEPTION_ATTACHMENTS_BUCKET = "reception-attachments";
const FIELD_LIMITS = {
  full_name: 150,
  phone: 50,
  email: 254,
  request_type: 100,
  subject: 200,
  message: 5000,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d\s\-()]{7,}$/;
const ALLOWED_REQUEST_TYPES = new Set(["ariza", "shikoyat", "taklif", "ma'lumot", "ma’lumot"]);
const ALLOWED_ATTACHMENT_MIME_TO_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
};
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "jpg", "jpeg", "png"]);

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

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "on";
  }

  return false;
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

function generateRequestNumber() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `VR-${year}-${random}`;
}

function getExtensionFromFileName(fileName: string) {
  const raw = fileName.split(".").pop()?.toLowerCase() ?? "";
  return raw.replace(/[^a-z0-9]/g, "");
}

function isImageAttachment(mimeType: string, extension: string) {
  return mimeType.startsWith("image/") || extension === "jpg" || extension === "jpeg" || extension === "png";
}

function detectAttachmentExtension(fileName: string, mimeType: string) {
  const fileExtension = getExtensionFromFileName(fileName);
  const mimeExtensions = ALLOWED_ATTACHMENT_MIME_TO_EXTENSIONS[mimeType] ?? [];

  if (fileExtension && mimeExtensions.includes(fileExtension)) {
    return fileExtension;
  }

  if (fileExtension && ALLOWED_ATTACHMENT_EXTENSIONS.has(fileExtension) && mimeExtensions.length === 0) {
    return fileExtension;
  }

  if (mimeExtensions.length > 0) {
    return mimeExtensions[0];
  }

  return "";
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
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

  // Check for status search request
  const url = new URL(request.url);
  const checkCodeParam = url.searchParams.get("check_code") || url.searchParams.get("code");

  if (checkCodeParam) {
    const cleanCode = checkCodeParam.trim();
    const { data: recData } = await admin
      .from("reception_requests")
      .select("id, request_number, full_name, subject, status, admin_reply, created_at")
      .or(`request_number.ilike.${cleanCode},id.eq.${cleanCode}`)
      .maybeSingle();

    if (recData) {
      return jsonResponse(
        200,
        {
          ok: true,
          found: true,
          code: recData.request_number,
          type_label: "Virtual Qabulxona Murojaati",
          full_name: recData.full_name,
          subject: recData.subject,
          status: recData.status || "accepted",
          admin_reply: recData.admin_reply || null,
          created_at: recData.created_at,
        },
        origin,
      );
    }
  }

  let validated: {
    fullName: string;
    phone: string;
    email: string;
    requestType: string;
    subject: string;
    message: string;
    consent: boolean;
    website: string;
  };

  let attachmentBytes: Uint8Array | null = null;
  let attachmentFileName = "";
  let attachmentMimeType = "";
  let attachmentExtension = "";

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const actionVal = toTrimmedString(formData.get("action"));
    const codeVal = toTrimmedString(formData.get("code") || formData.get("check_code"));

    if (actionVal === "check" || codeVal) {
      const targetCode = codeVal || actionVal;
      const { data: recData } = await admin
        .from("reception_requests")
        .select("id, request_number, full_name, subject, status, admin_reply, created_at")
        .or(`request_number.ilike.${targetCode},id.eq.${targetCode}`)
        .maybeSingle();

      if (recData) {
        return jsonResponse(
          200,
          {
            ok: true,
            found: true,
            code: recData.request_number,
            type_label: "Virtual Qabulxona Murojaati",
            full_name: recData.full_name,
            subject: recData.subject,
            status: recData.status || "accepted",
            admin_reply: recData.admin_reply || null,
            created_at: recData.created_at,
          },
          origin,
        );
      }
      return jsonResponse(200, { ok: true, found: false }, origin);
    }

    validated = {
      fullName: toTrimmedString(formData.get("full_name")),
      phone: toTrimmedString(formData.get("phone")),
      email: toTrimmedString(formData.get("email")),
      requestType: toTrimmedString(formData.get("request_type")),
      subject: toTrimmedString(formData.get("subject")),
      message: toTrimmedString(formData.get("message")),
      consent: toBoolean(formData.get("consent")),
      website: toTrimmedString(formData.get("website")),
    };

    const file = formData.get("attachment");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        return jsonResponse(400, { ok: false, message: "Fayl hajmi 10MB dan oshmasligi kerak." }, origin);
      }

      attachmentFileName = file.name;
      attachmentMimeType = file.type || "application/octet-stream";
      attachmentExtension = detectAttachmentExtension(attachmentFileName, attachmentMimeType);

      if (!attachmentExtension || !ALLOWED_ATTACHMENT_EXTENSIONS.has(attachmentExtension)) {
        return jsonResponse(400, { ok: false, message: "Faqat PDF, DOC, DOCX, JPG, JPEG, PNG fayllari qabul qilinadi." }, origin);
      }

      const buffer = await file.arrayBuffer();
      attachmentBytes = new Uint8Array(buffer);
    }
  } else {
    let payload: SubmitPayload = {};
    try {
      payload = (await request.json()) as SubmitPayload;
    } catch {
      return jsonResponse(400, { ok: false, message: "So'rov formati noto'g'ri." }, origin);
    }

    if (payload.action === "check" || payload.check_code) {
      const targetCode = toTrimmedString(payload.check_code || payload.action);
      const { data: recData } = await admin
        .from("reception_requests")
        .select("id, request_number, full_name, subject, status, admin_reply, created_at")
        .or(`request_number.ilike.${targetCode},id.eq.${targetCode}`)
        .maybeSingle();

      if (recData) {
        return jsonResponse(
          200,
          {
            ok: true,
            found: true,
            code: recData.request_number,
            type_label: "Virtual Qabulxona Murojaati",
            full_name: recData.full_name,
            subject: recData.subject,
            status: recData.status || "accepted",
            admin_reply: recData.admin_reply || null,
            created_at: recData.created_at,
          },
          origin,
        );
      }
      return jsonResponse(200, { ok: true, found: false }, origin);
    }

    validated = {
      fullName: toTrimmedString(payload.full_name),
      phone: toTrimmedString(payload.phone),
      email: toTrimmedString(payload.email),
      requestType: toTrimmedString(payload.request_type),
      subject: toTrimmedString(payload.subject),
      message: toTrimmedString(payload.message),
      consent: toBoolean(payload.consent),
      website: toTrimmedString(payload.website),
    };
  }

  if (validated.website) {
    return jsonResponse(200, { ok: true, message: "Murojaat yuborildi." }, origin);
  }

  if (!validated.fullName || !validated.phone || !validated.subject || !validated.message) {
    return jsonResponse(400, { ok: false, message: "Iltimos, barcha majburiy maydonlarni to'ldiring." }, origin);
  }

  let attachmentObjectPath: string | null = null;

  if (attachmentBytes && attachmentExtension) {
    const timePrefix = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const safeBaseName = sanitizeFileName(attachmentFileName) || `attachment_${timePrefix}.${attachmentExtension}`;
    attachmentObjectPath = `${timePrefix}_${randomSuffix}/${safeBaseName}`;

    const { error: uploadError } = await admin.storage
      .from(RECEPTION_ATTACHMENTS_BUCKET)
      .upload(attachmentObjectPath, attachmentBytes, {
        contentType: attachmentMimeType || undefined,
      });

    if (uploadError) {
      return jsonResponse(500, { ok: false, message: "Faylni yuklab bo'lmadi." }, origin);
    }
  }

  let inserted: { id: string; created_at: string; request_number: string } | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const requestNumber = generateRequestNumber();

    const insertResult = await admin
      .from("reception_requests")
      .insert({
        request_number: requestNumber,
        full_name: validated.fullName,
        phone: validated.phone,
        email: validated.email,
        request_type: validated.requestType,
        subject: validated.subject,
        message: validated.message,
        attachment_url: attachmentObjectPath,
        status: "accepted",
      })
      .select("id, created_at, request_number")
      .single();

    if (!insertResult.error && insertResult.data) {
      inserted = insertResult.data as { id: string; created_at: string; request_number: string };
      break;
    }
  }

  if (!inserted) {
    return jsonResponse(500, { ok: false, message: "Murojaatni yuborib bo'lmadi." }, origin);
  }

  let telegramNotified = false;
  const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (telegramBotToken && telegramChatId) {
    const createdAt = formatTashkentDateTime(inserted.created_at);
    const telegramText = [
      "🏛 Yangi virtual qabulxona murojaati",
      "",
      `📌 Murojaat raqami: ${inserted.request_number}`,
      `👤 F.I.Sh.: ${clipForTelegram(validated.fullName, 150)}`,
      `📞 Telefon: ${clipForTelegram(validated.phone, 80)}`,
      `✉️ Email: ${clipForTelegram(validated.email || "Yo'q", 254)}`,
      `📋 Turi: ${clipForTelegram(validated.requestType, 100)}`,
      `📝 Mavzu: ${clipForTelegram(validated.subject, 200)}`,
      `📎 Fayl: ${attachmentObjectPath ? attachmentFileName || "Biriktirilgan" : "Yo'q"}`,
      "",
      "📄 Xabar:",
      clipForTelegram(validated.message, 1800),
      "",
      `📅 Sana: ${createdAt}`,
      `🔑 ID: ${inserted.id}`,
    ].join("\n");

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "🟢 Qabul qilindi", callback_data: `status:VR:accepted:${inserted.id}` },
          { text: "🟡 Ko'rib chiqilmoqda", callback_data: `status:VR:in_progress:${inserted.id}` },
        ],
        [
          { text: "✅ Yakunlandi", callback_data: `status:VR:completed:${inserted.id}` },
          { text: "🔴 Rad etildi", callback_data: `status:VR:rejected:${inserted.id}` },
        ],
      ],
    };

    try {
      let telegramResponse: Response;

      if (attachmentBytes && attachmentObjectPath) {
        const endpoint = isImageAttachment(attachmentMimeType, attachmentExtension) ? "sendPhoto" : "sendDocument";
        const formData = new FormData();
        formData.append("chat_id", telegramChatId);
        formData.append("caption", telegramText);
        formData.append("reply_markup", JSON.stringify(inlineKeyboard));
        formData.append(
          endpoint === "sendPhoto" ? "photo" : "document",
          new Blob([attachmentBytes], {
            type: attachmentMimeType || "application/octet-stream",
          }),
          attachmentFileName || `attachment.${attachmentExtension}`,
        );

        telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/${endpoint}`, {
          method: "POST",
          body: formData,
        });
      } else {
        telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: telegramText,
            disable_web_page_preview: true,
            reply_markup: inlineKeyboard,
          }),
        });
      }

      if (telegramResponse.ok) {
        telegramNotified = true;
      }
    } catch {
      console.error("reception-submit telegram request failed");
    }
  }

  return jsonResponse(
    200,
    {
      ok: true,
      submission_id: inserted.id,
      request_number: inserted.request_number,
      telegram_notified: telegramNotified,
    },
    origin,
  );
});
