import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, CheckCircle2, Paperclip, ShieldCheck, Copy, Check } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { StatusChecker } from "@/components/site/StatusChecker";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/virtual-qabulxona")({
  head: () => ({
    meta: [
      { title: "Virtual qabulxona | 215-sonli maktab" },
      { name: "description", content: "Onlayn murojaat yuborish uchun virtual qabulxona va holatni tekshirish." },
    ],
  }),
  component: VirtualReception,
});

function VirtualReception() {
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
    const requestType = String(fd.get("type") ?? "").trim();
    const subject = String(fd.get("subject") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();
    const attachment = fd.get("attachment");
    const website = String(fd.get("website") ?? "").trim();
    const attachmentFile = attachment instanceof File && attachment.size > 0 ? attachment : null;

    if (!name || !phone || !subject || !message) {
      setFormError("Iltimos, barcha majburiy maydonlarni to'ldiring.");
      return;
    }

    setSubmitting(true);

    try {
      let code: string | null = null;

      // 1. Try Edge Function Submission
      const body = new FormData();
      body.set("full_name", name);
      body.set("phone", phone);
      body.set("email", email);
      body.set("request_type", requestType);
      body.set("subject", subject);
      body.set("message", message);
      body.set("consent", "true");
      body.set("website", website);

      if (attachmentFile) {
        body.set("attachment", attachmentFile, attachmentFile.name);
      }

      try {
        const res = await supabase.functions.invoke("reception-submit", { body });
        if (res.data && res.data.ok && res.data.request_number) {
          code = res.data.request_number;
        }
      } catch {
        // Fallback to direct DB insert
      }

      // 2. Direct Supabase Database Insert Fallback
      if (!code) {
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const reqNum = `VR-2026-${randomNum}`;

        const { data: dbData, error: dbErr } = await supabase
          .from("reception_requests")
          .insert({
            request_number: reqNum,
            full_name: name,
            phone: phone,
            email: email || null,
            request_type: requestType || "ariza",
            subject: subject,
            message: message,
            status: "accepted",
          })
          .select("request_number")
          .single();

        if (dbData?.request_number) {
          code = dbData.request_number;
        } else if (!dbErr) {
          code = reqNum;
        }
      }

      if (code) {
        setSubmittedCode(code);
        formEl.reset();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setFormError("Murojaatni yuborib bo'lmadi. Qayta urinib ko'ring.");
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
        title="Virtual qabulxona"
        breadcrumbs={[{ label: "Bosh sahifa", to: "/" }, { label: "Virtual qabulxona" }]}
        description="Rasmiy murojaatingizni onlayn tarzda yuboring. Har bir murojaat qonun doirasida ko‘rib chiqiladi."
      />

      <Section>
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Success Banner showing Unique Reference Code */}
          {submittedCode && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-6 sm:p-8 shadow-lg space-y-4">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-display text-xl font-bold text-emerald-950">
                    Murojaatingiz Muvaffaqiyatli Yuborildi!
                  </h3>
                  <p className="text-sm text-emerald-850">
                    Sizning murojaatingiz mas'ul xodimlarimizga yetkazildi. Murojaat holatini kuzatib borish uchun quyidagi takrorlanmas kodingizni saqlab qo'ying:
                  </p>
                </div>
              </div>

              {/* Unique Code Box & Copy Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
                <div className="space-y-0.5 text-center sm:text-left">
                  <span className="text-xs uppercase font-semibold text-emerald-800 tracking-wider">
                    Sizning Murojaat Kodingiz:
                  </span>
                  <div className="font-mono text-2xl font-extrabold text-primary-dark">
                    {submittedCode}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-emerald-700"
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

          {/* Virtual Reception Form */}
          <div className="rounded-2xl border border-border bg-background p-6 shadow-card md:p-8 space-y-6">
            <div className="border-b border-border/60 pb-4">
              <h2 className="font-display text-xl font-bold text-primary-dark">
                Onlayn Murojaat Shakli
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Maydonlarni to'ldiring va murojaatingizni yuboring.
              </p>
            </div>

            {formError && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3.5 text-xs sm:text-sm text-red-800">
                {formError}
              </div>
            )}

            <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
              <Field name="name" label="F.I.Sh." required />
              <Field name="phone" label="Telefon" placeholder="+998 __ ___-__-__" required />
              <Field name="email" label="Elektron pochta (ixtiyoriy)" type="email" />
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Murojaat turi <span className="text-destructive">*</span>
                </label>
                <select
                  name="type"
                  className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  defaultValue="ariza"
                >
                  <option value="ariza">Ariza</option>
                  <option value="shikoyat">Shikoyat</option>
                  <option value="taklif">Taklif</option>
                  <option value="ma’lumot">Ma’lumot so‘rovi</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Field name="subject" label="Mavzu" required />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">
                  Xabar <span className="text-destructive">*</span>
                </label>
                <textarea
                  name="message"
                  rows={5}
                  required
                  placeholder="Murojaat mazmunini batafsil yozing..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border bg-surface-muted px-4 py-3 text-sm text-muted-foreground hover:border-primary/50">
                  <Paperclip className="h-4 w-4 text-primary" />
                  Fayl biriktirish (ixtiyoriy) — PDF, DOC, DOCX, JPG, JPEG, PNG
                  <input
                    type="file"
                    name="attachment"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                    className="hidden"
                  />
                </label>
              </div>
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="consent" defaultChecked className="mt-1 h-4 w-4 accent-primary" />
                  <span className="text-muted-foreground">
                    Shaxsiy ma’lumotlarim qonunchilikka muvofiq qayta ishlanishiga roziman.
                  </span>
                </label>
              </div>
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Barcha ma’lumotlar himoyalangan
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#003B7A] px-6 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:opacity-50 shadow-md"
                >
                  <Send className="h-4 w-4" /> {submitting ? "Yuborilmoqda..." : "Murojaat yuborish"}
                </button>
              </div>
            </form>
          </div>

          {/* Status Checker Block */}
          <StatusChecker defaultCode={submittedCode || undefined} />
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
      <label className="mb-1.5 block text-sm font-medium">
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
