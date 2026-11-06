/**
 * Progress list for multi-transaction flows.
 * steps: [{ id, label, chain, status: "idle"|"active"|"done"|"error"|"skipped", link?, error? }]
 */
const ICON = { idle: "○", active: "◐", done: "●", error: "✕", skipped: "–" };
const TONE = {
  idle: "text-muted",
  active: "text-warn",
  done: "text-accent",
  error: "text-sell",
  skipped: "text-muted",
};

export function TxSteps({ steps }) {
  return (
    <ol className="flex flex-col gap-2" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s.id} className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={`w-4 text-center ${TONE[s.status]}`} aria-hidden>{ICON[s.status]}</span>
            <span className={s.status === "idle" ? "text-muted" : ""}>
              {i + 1}. {s.label}
            </span>
            {s.chain && <span className="ml-auto text-xs text-muted">{s.chain}</span>}
          </div>
          {s.link && (
            <a href={s.link} target="_blank" rel="noreferrer" className="ml-6 text-xs text-accent hover:underline">
              View transaction
            </a>
          )}
          {s.error && <p className="ml-6 text-xs text-sell">{s.error}</p>}
        </li>
      ))}
    </ol>
  );
}

export function initSteps(defs) {
  return defs.map((d) => ({ status: "idle", ...d }));
}

export function updateStep(steps, id, patch) {
  return steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

/** Shortest useful message from wallet / viem errors. */
export function errorMessage(err) {
  if (!err) return "";
  if (/user (rejected|denied)/i.test(err.message || "")) return "Rejected in wallet";
  return err.shortMessage || err.details || err.message || String(err);
}
