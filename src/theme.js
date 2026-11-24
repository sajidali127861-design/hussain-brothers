import config from "./config";
const KEY = "shop_mode";
export function getMode() {
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") return saved;
  const d = config.theme.defaultMode;
  if (d === "light" || d === "dark") return d;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
export function applyTheme(mode) {
  const root = document.documentElement;
  const colors = config.theme[mode];
  Object.entries(colors).forEach(([k, v]) => root.style.setProperty("--" + k, v));
  root.style.setProperty("--radius", config.theme.radius);
  root.dataset.mode = mode;
  root.style.colorScheme = mode;
  try { localStorage.setItem(KEY, mode); } catch {}
}
