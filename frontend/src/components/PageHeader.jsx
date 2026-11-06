import emptyIllustration from "../assets/images/NoTransaction.svg";

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Section title like the original "Live Deals" / "Fast Track" headings. */
export function SectionTitle({ children, aside }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between gap-4 first:mt-0">
      <h2 className="text-xl font-semibold tracking-tight">{children}</h2>
      {aside}
    </div>
  );
}

/** Grey rounded container with an optional toolbar row (filters, tabs, search). */
export function Panel({ toolbar, children, className = "" }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-line bg-surface-2 ${className}`}>
      {toolbar && <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">{toolbar}</div>}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Pill tab group; the active tab gets the brand gradient. */
export function PillTabs({ tabs, value, onChange, label }) {
  return (
    <div className="inline-flex w-fit max-w-full overflow-x-auto rounded-full border border-line bg-surface p-1" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            value === t.value ? "bg-brand-gradient text-accent-ink" : "text-ink hover:bg-surface-2"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ title, children, compact = false }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-6" : "py-12"}`}>
      {!compact && <img src={emptyIllustration} alt="" className="mb-4 h-32 w-32 opacity-90" />}
      <p className="max-w-md text-[15px] font-medium text-muted">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}
