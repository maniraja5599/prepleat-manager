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

const CUSTOM_VARS: Array<
  [keyof NonNullable<ReturnType<typeof useStore.getState>["settings"]["customColors"]>, string]
> = [
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
  const fontSize = useStore((s) => s.settings.fontSize) || "standard";

  const businessName = useStore((s) => s.settings.businessName);
  const logoDataUrl = useStore((s) => s.settings.logoDataUrl);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // 1. Dynamic Browser Title
    const bName = businessName?.trim();
    document.title = bName ? `${bName} — Saree PrePleat Manager` : "Saree PrePleat Manager";

    // 2. Dynamic Favicon
    if (logoDataUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "shortcut icon";
        document.getElementsByTagName("head")[0]?.appendChild(link);
      }
      link.href = logoDataUrl;
    }

    // Apply font size scale
    root.setAttribute("data-font-size", fontSize);

    // Apply theme classes
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
  }, [theme, customPrimary, customColors, fontSize, businessName, logoDataUrl]);
  return null;
}
