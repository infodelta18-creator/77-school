export function SchoolLogo({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <div
      className={`${className} flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow-card`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="h-2/3 w-2/3" fill="none">
        <path
          d="M24 6 4 16v3l20 10 20-10v-3L24 6Zm0 5 12 6-12 6-12-6 12-6Z"
          fill="currentColor"
        />
        <path
          d="M12 22v8c0 3 5 6 12 6s12-3 12-6v-8l-12 6-12-6Z"
          fill="currentColor"
          opacity=".85"
        />
        <circle cx="40" cy="20" r="1.5" fill="var(--color-gold)" />
      </svg>
    </div>
  );
}
