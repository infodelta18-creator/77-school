import type { ReactNode } from "react";

export function Section({
  eyebrow,
  title,
  description,
  action,
  children,
  className = "",
  muted = false,
  id,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  muted?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`py-14 md:py-20 ${muted ? "bg-surface-muted" : "bg-background"} ${className}`}
    >
      <div className="container-page">
        {(title || eyebrow) && (
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              {eyebrow && <div className="section-eyebrow">{eyebrow}</div>}
              {title && (
                <h2 className="section-title mt-2 relative pb-3">
                  {title}
                  <span className="absolute left-0 bottom-0 h-0.5 w-12 bg-gold" />
                </h2>
              )}
              {description && (
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {action && <div>{action}</div>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
