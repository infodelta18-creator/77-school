import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AdminUsersAction = "list" | "create" | "update_role" | "update_status";

type AdminUsersRequest = {
  action?: unknown;
  full_name?: unknown;
  email?: unknown;
  temporary_password?: unknown;
  role?: unknown;
  user_id?: unknown;
  is_active?: unknown;
  is_suspended?: unknown;
};

type ProfileRow = {
  id: string;
  full_name: string;
  role: "super_admin" | "admin" | "editor";
  is_active: boolean;
  is_suspended: boolean;
  created_at: string;
};

type ListUser = {
  id: string;
  full_name: string;
  email: string | null;
  role: "super_admin" | "admin" | "editor";
  is_active: boolean;
  is_suspended: boolean;
  created_at: string;
};

const ALLOWED_STAFF_ROLES = new Set(["admin", "editor"]);
const MAX_BODY_BYTES = 64 * 1024;

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

function normalizeRole(value: unknown) {
  const role = toTrimmedString(value);
  return role === "admin" || role === "editor" ? role : "";
}

function isBoolean(value: unknown) {
  return typeof value === "boolean";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isStrongTemporaryPassword(value: string) {
  return value.length >= 8 && value.length <= 128;
}

function isValidFullName(value: string) {
  return value.length >= 2 && value.length <= 150;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? request.headers.get("Authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

async function parseRequest(request: Request, origin: string | null) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return {
      errorResponse: jsonResponse(
        415,
        {
          ok: false,
          error: "unsupported_media_type",
          message: "Faqat application/json qabul qilinadi.",
        },
        origin,
      ),
    };
  }

  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return { errorResponse: jsonResponse(400, { ok: false, error: "validation_error", message: "So'rov o'qib bo'lmadi." }, origin) };
  }

  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return { errorResponse: jsonResponse(413, { ok: false, error: "payload_too_large", message: "So'rov hajmi juda katta." }, origin) };
  }

  try {
    const payload = JSON.parse(rawBody) as AdminUsersRequest;
    return { payload };
  } catch {
    return { errorResponse: jsonResponse(400, { ok: false, error: "validation_error", message: "JSON noto'g'ri formatda." }, origin) };
  }
}

function createClients() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return null;
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { authClient, adminClient };
}

async function requireSuperAdmin(request: Request, origin: string | null) {
  const token = getBearerToken(request);
  if (!token) {
    return { errorResponse: jsonResponse(401, { ok: false, error: "unauthenticated", message: "Kirish talab qilinadi." }, origin) };
  }

  const clients = createClients();
  if (!clients) {
    return { errorResponse: jsonResponse(500, { ok: false, error: "server_misconfigured", message: "Server sozlanmagan." }, origin) };
  }

  const { authClient, adminClient } = clients;
  const { data: userData, error: userError } = await authClient.auth.getUser(token);

  if (userError || !userData.user) {
    return { errorResponse: jsonResponse(401, { ok: false, error: "unauthenticated", message: "Kirish talab qilinadi." }, origin) };
  }

  const callerClient = createClient(Deno.env.get("SUPABASE_URL") as string, Deno.env.get("SUPABASE_ANON_KEY") as string, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: profile, error: profileError } = await callerClient
    .from("profiles")
    .select("id, full_name, role, is_active, is_suspended, created_at")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { errorResponse: jsonResponse(403, { ok: false, error: "forbidden", message: "Ruxsat yo'q." }, origin) };
  }

  const caller = profile as ProfileRow;
  if (caller.role !== "super_admin" || !caller.is_active || caller.is_suspended) {
    return { errorResponse: jsonResponse(403, { ok: false, error: "forbidden", message: "Ruxsat yo'q." }, origin) };
  }

  return { caller, adminClient };
}

async function listUsers(adminClient: ReturnType<typeof createClient>) {
  const perPage = 100;
  let page = 1;
  const authUsers: Array<{
    id: string;
    email: string | null;
    created_at: string;
    user_metadata?: Record<string, unknown> | null;
  }> = [];

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      return {
        error,
        operation: "auth_admin_list_users",
        diagnostics: {
          auth_list_has_data: Boolean(data),
          auth_list_users_count: Array.isArray(data?.users) ? data.users.length : 0,
        },
      };
    }

    const users = data?.users ?? [];
    authUsers.push(
      ...users.map((user) => ({
        id: user.id,
        email: user.email ?? null,
        created_at: user.created_at,
        user_metadata: (user.user_metadata ?? null) as Record<string, unknown> | null,
      })),
    );

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  const ids = authUsers.map((user) => user.id);
  if (ids.length === 0) {
    return { users: [] };
  }

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, full_name, role, is_active, is_suspended, created_at")
    .in("id", ids);

  if (profilesError) {
    return {
      error: profilesError,
      operation: "profiles_select_for_auth_users",
      diagnostics: {
        auth_users_count: authUsers.length,
        profiles_has_data: Array.isArray(profiles),
      },
    };
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile as ProfileRow]));
  const users: ListUser[] = authUsers
    .map((authUser) => {
      const profile = profilesById.get(authUser.id);
      const fallbackName =
        typeof authUser.user_metadata?.full_name === "string"
          ? authUser.user_metadata.full_name.trim()
          : (authUser.email?.split("@")[0] ?? authUser.id);

      return {
        id: authUser.id,
        full_name: profile?.full_name ?? fallbackName,
        email: authUser.email,
        role: profile?.role ?? "editor",
        is_active: profile?.is_active ?? false,
        is_suspended: profile?.is_suspended ?? false,
        created_at: authUser.created_at,
      };
    })
    .sort((left, right) => right.created_at.localeCompare(left.created_at));

  return { users };
}

async function getTargetUser(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<{
  profile: ProfileRow | null;
  authUser: { id: string; email: string | null; created_at: string } | null;
}> {
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, full_name, role, is_active, is_suspended, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return { profile: null, authUser: null };
  }

  const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId);
  if (authError || !authUser?.user) {
    return { profile: profile as ProfileRow, authUser: null };
  }

  return {
    profile: profile as ProfileRow,
    authUser: {
      id: authUser.user.id,
      email: authUser.user.email ?? null,
      created_at: authUser.user.created_at,
    },
  };
}

function buildUserResponse(profile: ProfileRow, authUser?: { id: string; email?: string | null; created_at: string }) {
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: authUser?.email ?? null,
    role: profile.role,
    is_active: profile.is_active,
    is_suspended: profile.is_suspended,
    created_at: authUser?.created_at ?? profile.created_at,
  };
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
    return jsonResponse(405, { ok: false, error: "method_not_allowed", message: "Faqat POST ruxsat etiladi." }, origin);
  }

  const parsed = await parseRequest(request, origin);
  if (parsed.errorResponse) {
    return parsed.errorResponse;
  }

  const authResult = await requireSuperAdmin(request, origin);
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const { caller, adminClient } = authResult;
  const payload = parsed.payload ?? {};
  const action = toTrimmedString(payload.action) as AdminUsersAction | "";

  if (action === "list") {
    const result = await listUsers(adminClient);
    if ("error" in result && result.error) {
      const safeDiagnostics = {
        operation: ("operation" in result && typeof result.operation === "string") ? result.operation : "unknown",
        code: typeof result.error.code === "string" ? result.error.code : null,
        message: result.error.message ?? null,
        ...(typeof result === "object" && result && "diagnostics" in result ? { diagnostics: result.diagnostics } : {}),
      };

      console.error("admin-users list error", safeDiagnostics);
      return jsonResponse(
        500,
        {
          ok: false,
          error: "internal_error",
          message: "Foydalanuvchilar yuklanmadi.",
          details: safeDiagnostics,
        },
        origin,
      );
    }

    return jsonResponse(200, { ok: true, users: result.users ?? [] }, origin);
  }

  if (action === "create") {
    const fullName = toTrimmedString(payload.full_name);
    const email = toTrimmedString(payload.email).toLowerCase();
    const temporaryPassword = toTrimmedString(payload.temporary_password);
    const role = normalizeRole(payload.role);

    if (!isValidFullName(fullName)) {
      return jsonResponse(400, { ok: false, error: "validation_error", message: "F.I.Sh. noto'g'ri." }, origin);
    }

    if (!isValidEmail(email)) {
      return jsonResponse(400, { ok: false, error: "validation_error", message: "Email noto'g'ri." }, origin);
    }

    if (!isStrongTemporaryPassword(temporaryPassword)) {
      return jsonResponse(400, { ok: false, error: "validation_error", message: "Vaqtinchalik parol kamida 8 belgidan iborat bo'lishi kerak." }, origin);
    }

    if (!ALLOWED_STAFF_ROLES.has(role)) {
      return jsonResponse(400, { ok: false, error: "validation_error", message: "Rol noto'g'ri." }, origin);
    }

    const { data: existingUsers, error: existingUserError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (existingUserError) {
      return jsonResponse(500, { ok: false, error: "internal_error", message: "Foydalanuvchi tekshirilmagan." }, origin);
    }

    const duplicate = (existingUsers?.users ?? []).find((user) => user.email?.toLowerCase() === email);
    if (duplicate) {
      return jsonResponse(409, { ok: false, error: "conflict", message: "Bu email bilan foydalanuvchi allaqachon mavjud." }, origin);
    }

    const createResult = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createResult.error || !createResult.data.user) {
      const message = createResult.error?.message ?? "Foydalanuvchi yaratilmadi.";
      return jsonResponse(400, { ok: false, error: "validation_error", message }, origin);
    }

    const createdUser = createResult.data.user;
    const profileResult = await adminClient
      .from("profiles")
      .upsert(
        {
          id: createdUser.id,
          full_name: fullName,
          role,
          is_active: true,
          is_suspended: false,
        },
        { onConflict: "id" },
      )
      .select("id, full_name, role, is_active, is_suspended, created_at")
      .single();

    if (profileResult.error || !profileResult.data) {
      await adminClient.auth.admin.deleteUser(createdUser.id);
      console.error("admin-users create profile error", { message: profileResult.error?.message ?? null });
      return jsonResponse(500, { ok: false, error: "internal_error", message: "Profil yaratilmadi." }, origin);
    }

    return jsonResponse(
      200,
      {
        ok: true,
        user: buildUserResponse(profileResult.data as ProfileRow, {
          id: createdUser.id,
          email: createdUser.email ?? email,
          created_at: createdUser.created_at,
        }),
      },
      origin,
    );
  }

  if (action === "update_role") {
    const userId = toTrimmedString(payload.user_id);
    const role = normalizeRole(payload.role);

    if (!userId) {
      return jsonResponse(400, { ok: false, error: "validation_error", message: "Foydalanuvchi topilmadi." }, origin);
    }

    if (!ALLOWED_STAFF_ROLES.has(role)) {
      return jsonResponse(400, { ok: false, error: "validation_error", message: "Rol noto'g'ri." }, origin);
    }

    if (userId === caller.id) {
      return jsonResponse(403, { ok: false, error: "forbidden", message: "O'zingizning rolingizni bu yerda o'zgartira olmaysiz." }, origin);
    }

    const target = await getTargetUser(adminClient, userId);
    if (!target.profile) {
      return jsonResponse(404, { ok: false, error: "not_found", message: "Foydalanuvchi topilmadi." }, origin);
    }

    if (target.profile.role === "super_admin") {
      return jsonResponse(403, { ok: false, error: "forbidden", message: "Super admin rolini o'zgartirib bo'lmaydi." }, origin);
    }

    const { data, error } = await adminClient
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select("id, full_name, role, is_active, is_suspended, created_at")
      .single();

    if (error || !data) {
      return jsonResponse(500, { ok: false, error: "internal_error", message: "Rol saqlanmadi." }, origin);
    }

    return jsonResponse(
      200,
      {
        ok: true,
        user: buildUserResponse(data as ProfileRow, {
          id: userId,
          email: target.authUser?.email ?? null,
          created_at: target.authUser?.created_at ?? data.created_at,
        }),
      },
      origin,
    );
  }

  if (action === "update_status") {
    const userId = toTrimmedString(payload.user_id);

    if (!userId) {
      return jsonResponse(400, { ok: false, error: "validation_error", message: "Foydalanuvchi topilmadi." }, origin);
    }

    if (!isBoolean(payload.is_active) || !isBoolean(payload.is_suspended)) {
      return jsonResponse(400, { ok: false, error: "validation_error", message: "Holat noto'g'ri." }, origin);
    }

    if (userId === caller.id) {
      return jsonResponse(403, { ok: false, error: "forbidden", message: "O'zingizning holatingizni bu yerda o'zgartira olmaysiz." }, origin);
    }

    const target = await getTargetUser(adminClient, userId);
    if (!target.profile) {
      return jsonResponse(404, { ok: false, error: "not_found", message: "Foydalanuvchi topilmadi." }, origin);
    }

    if (target.profile.role === "super_admin") {
      return jsonResponse(403, { ok: false, error: "forbidden", message: "Super admin holatini o'zgartirib bo'lmaydi." }, origin);
    }

    const { data, error } = await adminClient
      .from("profiles")
      .update({
        is_active: payload.is_active as boolean,
        is_suspended: payload.is_suspended as boolean,
      })
      .eq("id", userId)
      .select("id, full_name, role, is_active, is_suspended, created_at")
      .single();

    if (error || !data) {
      return jsonResponse(500, { ok: false, error: "internal_error", message: "Holat saqlanmadi." }, origin);
    }

    return jsonResponse(
      200,
      {
        ok: true,
        user: buildUserResponse(data as ProfileRow, {
          id: userId,
          email: target.authUser?.email ?? null,
          created_at: target.authUser?.created_at ?? data.created_at,
        }),
      },
      origin,
    );
  }

  return jsonResponse(400, { ok: false, error: "validation_error", message: "Amal noto'g'ri." }, origin);
});