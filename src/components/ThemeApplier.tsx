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
];

export function ThemeApplier() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    THEME_CLASSES.forEach((c) => root.classList.remove(c));
    if (theme && theme !== "maroon") root.classList.add(`theme-${theme}`);
  }, [theme]);
  return null;
}
