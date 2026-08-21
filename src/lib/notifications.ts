import { format, addDays } from "date-fns";
import { APP_VERSION } from "./changelog";

export type NotificationStatus = "granted" | "denied" | "default" | "unsupported";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationStatus {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return "denied";
  }
}

export async function sendNativeNotification(
  title: string,
  options: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  },
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  const defaultIcon = "/eyas-logo.png";
  const notificationOptions = {
    icon: options.icon || defaultIcon,
    badge: options.badge || defaultIcon,
    body: options.body,
    tag: options.tag || "eyas-general",
    data: options.data || { url: "/" },
  };

  try {
    // 1. Try sending via ServiceWorkerRegistration if available
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, notificationOptions);
        return true;
      }
    }

    // 2. Fallback to standard Window Notification
    const notif = new Notification(title, notificationOptions);
    notif.onclick = () => {
      window.focus();
      if (options.data?.url) {
        window.location.href = options.data.url;
      }
      notif.close();
    };
    return true;
  } catch (e) {
    console.error("Failed to send native notification:", e);
    return false;
  }
}

/**
 * Checks for upcoming deliveries tomorrow and today, sending browser push notifications once per day.
 */
export async function checkAndTriggerEventAlerts(bookings: any[]): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd");

  const lastNotifiedDay = localStorage.getItem("eyas_last_event_notified_day");
  if (lastNotifiedDay === todayStr) {
    // Already notified today
    return;
  }

  // 1. Check Tomorrow's Deliveries (1 Day Before Advance Notice!)
  const tomorrowBookings = bookings.filter((b) => {
    if (b.status === "cancelled" || b.status === "completed" || b.status === "delivered") return false;
    return b.deliveryDate === tomorrowStr;
  });

  if (tomorrowBookings.length > 0) {
    const totalSarees = tomorrowBookings.reduce((s, b) => s + (b.sareeCount || 1), 0);
    const sent = await sendNativeNotification("Tomorrow's Saree Deliveries 🔔", {
      body: `You have ${tomorrowBookings.length} booking (${totalSarees} saree${totalSarees > 1 ? "s" : ""}) scheduled for tomorrow!`,
      tag: `tomorrow-${tomorrowStr}`,
      data: { url: "/bookings" },
    });
    if (sent) {
      localStorage.setItem("eyas_last_event_notified_day", todayStr);
      return;
    }
  }

  // 2. Check Today's Deliveries
  const todayBookings = bookings.filter((b) => {
    if (b.status === "cancelled" || b.status === "completed" || b.status === "delivered") return false;
    return b.deliveryDate === todayStr;
  });

  if (todayBookings.length > 0) {
    const totalSarees = todayBookings.reduce((s, b) => s + (b.sareeCount || 1), 0);
    const sent = await sendNativeNotification("Today's Saree Deliveries 🔔", {
      body: `You have ${todayBookings.length} booking (${totalSarees} saree${totalSarees > 1 ? "s" : ""}) due today!`,
      tag: `today-${todayStr}`,
      data: { url: "/bookings" },
    });
    if (sent) {
      localStorage.setItem("eyas_last_event_notified_day", todayStr);
    }
  }
}

/**
 * Sends a native notification when the app is updated to a new version.
 */
export async function checkAndTriggerUpdateAlert(): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;

  const lastNotifiedVersion = localStorage.getItem("eyas_last_browser_notified_version");
  if (lastNotifiedVersion !== APP_VERSION) {
    const sent = await sendNativeNotification(`Eyas App Updated to v${APP_VERSION} ✨`, {
      body: "New features and performance improvements are live! Tap to check them out.",
      tag: `update-${APP_VERSION}`,
      data: { url: "/settings" },
    });
    if (sent) {
      localStorage.setItem("eyas_last_browser_notified_version", APP_VERSION);
    }
  }
}
