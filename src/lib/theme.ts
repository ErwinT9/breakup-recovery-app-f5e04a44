/**
 * Theme preference: "light" | "dark" | "system".
 *
 * The resolved theme is applied by toggling the `dark` class on <html>.
 * The preference is mirrored to localStorage synchronously so a reload
 * paints the right theme immediately (see the boot script in __root).
 */
export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "nc:theme";

type Listener = (mode: ThemeMode) => void;
const listeners = new Set<Listener>();

export function readThemeMode(): ThemeMode {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

export function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? systemTheme() : mode;
}

export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#12141a" : "#FFFFFF");
  return resolved;
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* storage unavailable */
  }
  applyTheme(mode);
  listeners.forEach((listener) => listener(mode));
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Applies the stored preference and keeps "system" in sync with the OS. */
export function initTheme(): () => void {
  let mode = readThemeMode();
  // "System default" is no longer offered in Settings: pin legacy/first-run
  // preferences to the concrete light/dark value the OS currently reports.
  if (mode === "system") {
    mode = resolveTheme("system");
    try {
      window.localStorage.setItem(THEME_KEY, mode);
    } catch {
      /* storage unavailable */
    }
  }
  applyTheme(mode);
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (readThemeMode() === "system") applyTheme("system");
  };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}