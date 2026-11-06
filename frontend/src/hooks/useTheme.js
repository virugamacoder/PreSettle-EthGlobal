import { useCallback, useEffect, useSyncExternalStore } from "react";

const KEY = "presettle-theme";
const listeners = new Set();

function read() {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    read,
    () => "dark",
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
