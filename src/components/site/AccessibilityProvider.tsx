import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Accessibility, X, Type, Contrast, Palette, Underline, RotateCcw } from "lucide-react";

type FontSize = "normal" | "large" | "xlarge";
type Settings = {
  fontSize: FontSize;
  grayscale: boolean;
  contrast: boolean;
  underline: boolean;
};

const DEFAULT: Settings = { fontSize: "normal", grayscale: false, contrast: false, underline: false };

type Ctx = { togglePanel: () => void };
const AccessibilityCtx = createContext<Ctx>({ togglePanel: () => {} });

export function useAccessibility() {
  return useContext(AccessibilityCtx);
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("a11y-settings");
      if (raw) setSettings({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const cl = document.documentElement.classList;
    cl.toggle("a11y-large", settings.fontSize === "large");
    cl.toggle("a11y-xlarge", settings.fontSize === "xlarge");
    cl.toggle("a11y-grayscale", settings.grayscale);
    cl.toggle("a11y-contrast", settings.contrast);
    cl.toggle("a11y-underline", settings.underline);
    try {
      localStorage.setItem("a11y-settings", JSON.stringify(settings));
    } catch {}
  }, [settings, hydrated]);

  return (
    <AccessibilityCtx.Provider value={{ togglePanel: () => setOpen((v) => !v) }}>
      {children}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-primary-dark/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-full max-w-sm flex-col bg-background shadow-elevated">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2 font-semibold text-primary-dark">
                <Accessibility className="h-5 w-5" />
                Maxsus imkoniyatlar
              </div>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-muted"
                aria-label="Yopish"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-auto px-5 py-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Type className="h-4 w-4 text-primary" /> Shrift o‘lchami
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["normal", "large", "xlarge"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSettings((p) => ({ ...p, fontSize: s }))}
                      className={`rounded-md border px-3 py-2 text-sm transition ${
                        settings.fontSize === s
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-surface-muted"
                      }`}
                    >
                      {s === "normal" ? "Oddiy" : s === "large" ? "Katta" : "Juda katta"}
                    </button>
                  ))}
                </div>
              </div>

              {[
                { key: "grayscale", label: "Rangsiz rejim", icon: Palette },
                { key: "contrast", label: "Yuqori kontrast", icon: Contrast },
                { key: "underline", label: "Havolalarni tagiga chizish", icon: Underline },
              ].map(({ key, label, icon: Icon }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between rounded-md border border-border px-4 py-3 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {label}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings[key as keyof Settings] as boolean}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, [key]: e.target.checked }))
                    }
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              ))}
            </div>
            <div className="border-t border-border px-5 py-4">
              <button
                onClick={() => setSettings(DEFAULT)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-muted"
              >
                <RotateCcw className="h-4 w-4" /> Sozlamalarni tiklash
              </button>
            </div>
          </aside>
        </div>
      )}
    </AccessibilityCtx.Provider>
  );
}
