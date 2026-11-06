import { useCallback, useEffect, useSyncExternalStore } from "react";

const KEY = "presettle-theme";
const listeners = new Set();

// Saved choice first; otherwise follow the system setting (light by default).
function read() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    read,
    () => "light",
  );

  useEffect(() => apply(theme), [theme]);

  const setTheme = useCallback((next) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage unavailable: theme still applies for this page */
    }
    apply(next);
    listeners.forEach((l) => l());
  }, []);

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
