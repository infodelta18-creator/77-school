import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, Copy, Check } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { StatusChecker } from "@/components/site/StatusChecker";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/boglanish")({
  head: () => ({
    meta: [
      { title: "Bog‘lanish | 215-sonli maktab" },
      { name: "description", content: "215-sonli maktab bilan bog‘lanish, manzil, telefon va elektron pochta." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { settings } = useSiteSettings();
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (submitting) {
      return;
    }

    setFormError("");
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);

    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const subject = String(fd.get("subject") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();
    const website = String(fd.get("website") ?? "").trim();

    if (!name || !phone || !message) {
      setFormError("Iltimos, barcha majburiy maydonlarni to'ldiring.");
      return;
    }

    setSubmitting(true);

    try {
      let code: string | null = null;

      // 1. Try Edge Function Submission
      try {
        const res = await supabase.functions.invoke("contact-submit", {
          body: {
            full_name: name,
            phone,
            email,
            subject: subject || "Umumiy murojaat",
            message,
            website,
          },
        });

        if (res.data && res.data.ok && res.data.ticket_number) {
          code = res.data.ticket_number;
        }
      } catch {
        // Fallback to direct DB insert
      }

      // 2. Direct Supabase Database Insert Fallback
      if (!code) {
        const { data: dbData, error: dbErr } = await supabase
          .from("contact_messages")
          .insert({
            full_name: name,
            phone: phone,
            email: email || null,
            subject: subject || "Umumiy murojaat",
            message: message,
            status: "accepted",
          })
          .select("id")
          .single();

        if (dbData?.id) {
          code = `MSG-2026-${dbData.id.slice(0, 6).toUpperCase()}`;
        }
      }

      if (code) {
        setSubmittedCode(code);
        formEl.reset();
      } else {
        setFormError("Xabarni yuborib bo'lmadi. Qayta urinib ko'ring.");
      }
    } catch {
      setFormError("Tizimda kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setSubmitting(false);
    }
  }

  const handleCopyCode = () => {
    if (!submittedCode) return;
    navigator.clipboard.writeText(submittedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SiteLayout>
      <PageHeader
        title="Bog‘lanish"
        breadcrumbs={[{ label: "Bosh sahifa", to: "/" }, { label: "Bog‘lanish" }]}
        description="Savol yoki taklifingiz bo‘lsa, biz bilan bog‘laning."
      />
      <Section>
        <div className="space-y-10">
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Contact Details Side */}
            <div className="lg:col-span-2 space-y-4">
              {[
                { icon: MapPin, label: "Manzil", value: settings.address },
                { icon: Phone, label: "Telefon", value: settings.phone },
                { icon: Mail, label: "Email", value: settings.email },
                { icon: Clock, label: "Ish vaqti", value: settings.workingHours },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-4 rounded-xl border border-border bg-background p-4 shadow-card">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
                    <div className="mt-0.5 font-semibold text-foreground">{value}</div>
                  </div>
                </div>
              ))}
              <div className="overflow-hidden rounded-xl border border-border shadow-card">
                <iframe
                  title="Xarita"
                  src={settings.mapEmbedUrl}
                  className="h-64 w-full"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Form Side */}
            <div className="lg:col-span-3 space-y-6">
              {/* Success Banner displaying MSG Code */}
              {submittedCode && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-6 shadow-lg space-y-4">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="font-display text-lg font-bold text-emerald-950">
                        Xabaringiz Muvaffaqiyatli Yuborildi!
                      </h3>
                      <p className="text-xs sm:text-sm text-emerald-850">
                        Xabaringiz uchun rahmat. Murojaatingiz holatini tekshirish uchun quyidagi takrorlanmas kodingizni saqlab qo'ying:
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
                    <div className="space-y-0.5 text-center sm:text-left">
                      <span className="text-[11px] uppercase font-semibold text-emerald-800 tracking-wider">
                        Sizning Murojaat Kodingiz:
                      </span>
                      <div className="font-mono text-xl font-extrabold text-primary-dark">
                        {submittedCode}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-emerald-700"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          KOD NUSXALANDI!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Kodni nusxalash
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-background p-6 shadow-card md:p-8">
                <h2 className="font-display text-xl font-bold text-primary-dark">Xabar yuborish</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quyidagi shakl orqali murojaat qoldiring. Sizga tez orada javob beramiz.
                </p>

                {formError && (
                  <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-xs sm:text-sm text-red-800">
                    {formError}
                  </div>
                )}

                <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
                  <Field name="name" label="F.I.Sh." required />
                  <Field name="phone" label="Telefon raqami" placeholder="+998 __ ___-__-__" required />
                  <Field name="email" label="Elektron pochta (ixtiyoriy)" type="email" />
                  <Field name="subject" label="Mavzu (ixtiyoriy)" />
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="website">Website</label>
                    <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Xabar <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      name="message"
                      rows={5}
                      required
                      placeholder="Xabaringizni kiritiring..."
                      className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#003B7A] px-6 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:opacity-50 shadow-md"
                    >
                      <Send className="h-4 w-4" />
                      {submitting ? "Yuborilmoqda..." : "Yuborish"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Status Checker Block at Bottom */}
          <div className="pt-4">
            <StatusChecker defaultCode={submittedCode || undefined} />
          </div>
        </div>
      </Section>
    </SiteLayout>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
    </div>
  );
}
