export const GA_MEASUREMENT_ID = "G-TYJ0W4G17T";

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Tracks a pageview in Google Analytics 4
 */
export function trackPageView(url: string, title?: string) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: url,
      page_title: title || (typeof document !== "undefined" ? document.title : ""),
    });
  }
}

/**
 * Tracks a custom event in Google Analytics 4
 */
export function trackEvent(
  action: string,
  params?: Record<string, string | number | boolean | undefined>
) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", action, params);
  }
}
