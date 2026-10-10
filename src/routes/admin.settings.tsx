import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getAdminSessionAndProfile } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import {
  SITE_SETTINGS_SELECT,
  type SiteSettingsRow,
} from "@/lib/site-settings";

type SiteSettingsForm = {
  organization_name: string;
  organization_short_name: string;
  organization_type: string;
  director_name: string;
  phone: string;
  email: string;
  address: string;
  working_hours: string;
  telegram_url: string;
  instagram_url: string;
  facebook_url: string;
  youtube_url: string;
  map_url: string;
  map_directions_url: string;
};

const initialForm: SiteSettingsForm = {
  organization_name: "",
  organization_short_name: "",
  organization_type: "",
  director_name: "",
  phone: "",
  email: "",
  address: "",
  working_hours: "",
  telegram_url: "",
  instagram_url: "",
  facebook_url: "",
  youtube_url: "",
  map_url: "",
  map_directions_url: "",
};

export const Route = createFileRoute("/admin/settings")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const result = await getAdminSessionAndProfile();

    if (result.status !== "authorized") {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminSettingsPage,
});

function toOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function mapRowToForm(row: SiteSettingsRow) {
  return {
    organization_name: row.organization_name ?? "",
    organization_short_name: row.organization_short_name ?? "",
    organization_type: row.organization_type ?? "",
    director_name: row.director_name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    working_hours: row.working_hours ?? "",
    telegram_url: row.telegram_url ?? "",
    instagram_url: row.instagram_url ?? "",
    facebook_url: row.facebook_url ?? "",
    youtube_url: row.youtube_url ?? "",
    map_url: row.map_url ?? "",
    map_directions_url: row.map_directions_url ?? "",
  };
}

function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSettingsRow, setHasSettingsRow] = useState(false);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [form, setForm] = useState<SiteSettingsForm>(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canEdit = useMemo(() => profileRole === "super_admin" || profileRole === "admin", [profileRole]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const auth = await getAdminSessionAndProfile();

      if (!mounted) {
        return;
      }

      if (auth.status !== "authorized") {
        router.navigate({ to: "/admin/login", replace: true });
        return;
      }

      setProfileRole(auth.profile.role);

      const { data, error: fetchError } = await supabase
        .from("site_settings")
        .select(SITE_SETTINGS_SELECT)
        .eq("id", 1)
        .maybeSingle();

      if (!mounted) {
        return;
      }

      if (fetchError) {
        setError("Sozlamalarni yuklab bo'lmadi.");
        setLoading(false);
        return;
      }

      if (!data) {
        setForm(initialForm);
        setHasSettingsRow(false);
        setLoading(false);
        return;
      }

      setForm(mapRowToForm(data as SiteSettingsRow));
      setHasSettingsRow(true);
      setLoading(false);
    }

    init();

    return () => {
      mounted = false;
    };
  }, [router]);

  const setField = (key: keyof SiteSettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess("");
  };

  const onSave = async () => {
    if (!canEdit || saving) {
      return;
    }

    setError("");
    setSuccess("");

    const organizationName = form.organization_name.trim();
    if (!organizationName) {
      setError("Tashkilot nomi majburiy.");
      return;
    }

    const email = form.email.trim();
    if (email && !isValidEmail(email)) {
      setError("Email manzili noto'g'ri.");
      return;
    }

    const urlFields: Array<{ key: keyof SiteSettingsForm; label: string }> = [
      { key: "telegram_url", label: "Telegram havolasi" },
      { key: "instagram_url", label: "Instagram havolasi" },
      { key: "facebook_url", label: "Facebook havolasi" },
      { key: "youtube_url", label: "YouTube havolasi" },
      { key: "map_url", label: "Xarita havolasi" },
      { key: "map_directions_url", label: "Google Maps yo'nalish havolasi" },
    ];

    for (const field of urlFields) {
      const value = form[field.key].trim();
      if (value && !isValidHttpUrl(value)) {
        setError(`${field.label} noto'g'ri.`);
        return;
      }
    }

    setSaving(true);

    const payload = {
      organization_name: organizationName,
      organization_short_name: toOptionalText(form.organization_short_name),
      organization_type: toOptionalText(form.organization_type),
      director_name: toOptionalText(form.director_name),
      phone: toOptionalText(form.phone),
      email: toOptionalText(form.email),
      address: toOptionalText(form.address),
      working_hours: toOptionalText(form.working_hours),
      telegram_url: toOptionalText(form.telegram_url),
      instagram_url: toOptionalText(form.instagram_url),
      facebook_url: toOptionalText(form.facebook_url),
      youtube_url: toOptionalText(form.youtube_url),
      map_url: toOptionalText(form.map_url),
      map_directions_url: toOptionalText(form.map_directions_url),
    };

    const saveQuery = hasSettingsRow
      ? supabase
          .from("site_settings")
          .update(payload)
          .eq("id", 1)
          .select(SITE_SETTINGS_SELECT)
          .single()
      : supabase
          .from("site_settings")
          .insert({ id: 1, ...payload })
          .select(SITE_SETTINGS_SELECT)
          .single();

    const { data, error: updateError } = await saveQuery;

    setSaving(false);

    if (updateError) {
      const details = [updateError.message, updateError.details, updateError.hint]
        .filter(Boolean)
        .join(" | ");
      setError(`Sozlamalarni saqlab bo'lmadi: ${details || "Unknown error"}`);
      return;
    }

    const updated = mapRowToForm(data as SiteSettingsRow);
    setForm(updated);
    setHasSettingsRow(true);
    setSuccess("Sozlamalar muvaffaqiyatli saqlandi.");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
          <p className="text-sm text-slate-400">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl rounded-xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Tashkilot sozlamalari</h1>
          <p className="mt-2 text-sm text-slate-400">
            Saytda ko'rsatiladigan asosiy tashkilot ma'lumotlari shu yerda boshqariladi.
          </p>
          {profileRole === "editor" ? (
            <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Sizda faqat ko'rish huquqi bor.
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        ) : null}

        <div className="space-y-8">
          <Section title="Tashkilot ma'lumotlari">
            <Field label="Tashkilot nomi" value={form.organization_name} disabled={!canEdit} onChange={(value) => setField("organization_name", value)} />
            <Field label="Qisqa nom" value={form.organization_short_name} disabled={!canEdit} onChange={(value) => setField("organization_short_name", value)} />
            <Field label="Tashkilot turi" value={form.organization_type} disabled={!canEdit} onChange={(value) => setField("organization_type", value)} />
          </Section>

          <Section title="Rahbariyat">
            <Field label="Rahbar (direktor)" value={form.director_name} disabled={!canEdit} onChange={(value) => setField("director_name", value)} />
          </Section>

          <Section title="Aloqa">
            <Field label="Telefon" value={form.phone} disabled={!canEdit} onChange={(value) => setField("phone", value)} />
            <Field label="Email" value={form.email} disabled={!canEdit} onChange={(value) => setField("email", value)} />
            <Field label="Manzil" value={form.address} disabled={!canEdit} onChange={(value) => setField("address", value)} />
            <Field label="Ish vaqti" value={form.working_hours} disabled={!canEdit} onChange={(value) => setField("working_hours", value)} />
          </Section>

          <Section title="Ijtimoiy tarmoqlar">
            <Field label="Telegram" value={form.telegram_url} disabled={!canEdit} onChange={(value) => setField("telegram_url", value)} />
            <Field label="Instagram" value={form.instagram_url} disabled={!canEdit} onChange={(value) => setField("instagram_url", value)} />
            <Field label="Facebook" value={form.facebook_url} disabled={!canEdit} onChange={(value) => setField("facebook_url", value)} />
            <Field label="YouTube" value={form.youtube_url} disabled={!canEdit} onChange={(value) => setField("youtube_url", value)} />
          </Section>

          <Section title="Joylashuv">
            <Field label="Xarita URL" value={form.map_url} disabled={!canEdit} onChange={(value) => setField("map_url", value)} />
            <Field label="Google Maps yo'nalish havolasi" value={form.map_directions_url} disabled={!canEdit} onChange={(value) => setField("map_directions_url", value)} />
          </Section>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5">
          <button
            type="button"
            onClick={() => router.navigate({ to: "/admin" })}
            className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Orqaga
          </button>

          {canEdit ? (
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="rounded-md border border-slate-700 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
      />
    </label>
  );
}
