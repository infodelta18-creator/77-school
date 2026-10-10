import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminSessionAndProfile, signInAdmin } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkExistingSession() {
      try {
        const result = await getAdminSessionAndProfile();

        if (!isMounted) {
          return;
        }

        if (result.status === "authorized") {
          router.navigate({ to: "/admin", replace: true });
          return;
        }
      } catch (err) {
        if (isMounted) {
          console.error("Session check error:", err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signInAdmin(email, password);

      if (result.status === "ok") {
        router.navigate({ to: "/admin", replace: true });
        return;
      }

      setError(result.message ?? "Kirishda muammo yuz berdi.");
    } catch (err) {
      console.error("Sign-in error:", err instanceof Error ? err.message : String(err));
      setError("Kirishda muammo yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
          <p className="text-sm text-slate-400">Tekshirilmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold">Boshqaruv paneliga kirish</h1>
          <p className="mt-2 text-sm text-slate-400">Faqat ruxsatli xodimlar uchun.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-0"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="password">
              Parol
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-0"
              required
            />
          </div>

          {error ? <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Kirish..." : "Kirish"}
          </button>
        </form>
      </div>
    </div>
  );
}
