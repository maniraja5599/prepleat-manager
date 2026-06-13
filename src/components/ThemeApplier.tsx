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
  "theme-gold",
  "theme-sunset",
  "theme-ocean",
  "theme-forest",
  "theme-vintage",
  "theme-custom",
];

const CUSTOM_VARS: Array<[keyof NonNullable<ReturnType<typeof useStore.getState>["settings"]["customColors"]>, string]> = [
  ["primary", "--primary"],
  ["accent", "--accent"],
  ["background", "--background"],
  ["card", "--card"],
  ["foreground", "--foreground"],
];

export function ThemeApplier() {
  const theme = useStore((s) => s.settings.theme);
  const customPrimary = useStore((s) => s.settings.customPrimary);
  const customColors = useStore((s) => s.settings.customColors);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    THEME_CLASSES.forEach((c) => root.classList.remove(c));
    if (theme && theme !== "maroon") root.classList.add(`theme-${theme}`);

    // Reset all custom-set vars first
    CUSTOM_VARS.forEach(([, css]) => root.style.removeProperty(css));
    root.style.removeProperty("--ring");

    if (theme === "custom") {
      const colors = customColors || { primary: customPrimary };
      CUSTOM_VARS.forEach(([key, css]) => {
        const v = colors[key];
        if (v) root.style.setProperty(css, v);
      });
      if (colors.primary) root.style.setProperty("--ring", colors.primary);
    }
  }, [theme, customPrimary, customColors]);
  return null;
}
