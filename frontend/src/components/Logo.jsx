/**
 * Pre Settle logo: a "P" whose bowl holds a check mark (a sealed, settled deal)
 * on the green→lime brand gradient, plus the wordmark.
 */
export function LogoMark({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ps-logo" x1="4" y1="44" x2="44" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0.13" stopColor="#3EDD59" />
          <stop offset="0.87" stopColor="#CCF566" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#ps-logo)" />
      <path d="M16 37V12h10a8 8 0 0 1 0 16H16" fill="none" stroke="#000009" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.6 20.4l2.6 2.6 4.6-5" fill="none" stroke="#000009" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ compact = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="text-lg font-semibold tracking-tight">
          Pre<span className="text-brand-gradient"> Settle</span>
        </span>
      )}
    </span>
  );
}
