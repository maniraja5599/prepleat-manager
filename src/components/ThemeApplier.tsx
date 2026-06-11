import { useEffect } from "react";
import { useStore } from "@/lib/store";

const THEME_CLASSES = [
  "theme-maroon",
  "theme-midnight",
  "theme-emerald",
  "theme-royal",
  "theme-rose",
  "theme-sand",
  "theme-charcoal",
  "theme-custom",
];

export function ThemeApplier() {
  const theme = useStore((s) => s.settings.theme);
  const customPrimary = useStore((s) => s.settings.customPrimary);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    THEME_CLASSES.forEach((c) => root.classList.remove(c));
    if (theme && theme !== "maroon") root.classList.add(`theme-${theme}`);
    if (theme === "custom" && customPrimary) {
      root.style.setProperty("--primary", customPrimary);
      root.style.setProperty("--ring", customPrimary);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
    }
  }, [theme, customPrimary]);
  return null;
}
