import { useEffect, useState } from "react";
import {
  ensureUserProfile,
  subscribeToUserProfile,
  subscribeToSystemConfig,
  checkSubscriptionStatus,
  type UserProfile,
  type SystemSubscriptionConfig,
  DEFAULT_CONFIG,
} from "@/lib/subscription";
import { PricingPlansModal } from "@/components/PricingPlansModal";
import { onAppAuthStateChanged, type AppUser } from "@/integrations/firebase/client";
import { AlertTriangle, Sparkles } from "lucide-react";

export function SubscriptionGuard() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<SystemSubscriptionConfig>(DEFAULT_CONFIG);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    // Listen to Auth
    const unsubAuth = onAppAuthStateChanged((u) => {
      setUser(u);
      if (u && !u.isAnonymous) {
        void ensureUserProfile(u).then((p) => {
          if (p) setProfile(p);
        });
      }
    });

    // Subscribe to system config
    const unsubConfig = subscribeToSystemConfig((c) => setConfig(c));

    // Listen for manual trigger from Settings / Topbar
    const handleTrigger = () => setPricingModalOpen(true);
    window.addEventListener("trigger-pricing-modal", handleTrigger);

    return () => {
      unsubAuth();
      unsubConfig();
      window.removeEventListener("trigger-pricing-modal", handleTrigger);
    };
  }, []);

  // Real-time subscription to profile when user is loaded
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const unsubProfile = subscribeToUserProfile(user.id, (p) => {
      if (p) setProfile(p);
    });
    return () => unsubProfile();
  }, [user]);

  const status = checkSubscriptionStatus(user, profile);
  const isExpiringSoon = !status.isExpired && !status.isLifetime && status.daysRemaining <= 7 && status.daysRemaining > 0;

  return (
    <>
      {/* 7-Days Before Expiry Amber Reminder Banner */}
      {isExpiringSoon && !bannerDismissed && (
        <div className="fixed top-0 inset-x-0 z-[25000] bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white px-3 sm:px-4 py-2 text-xs shadow-lg flex items-center justify-between gap-2 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 min-w-0 font-bold">
            <AlertTriangle className="size-4 shrink-0 text-amber-200 animate-pulse" />
            <span className="truncate">
              ⚠️ Subscription Expiring in <strong className="underline decoration-amber-300">{status.daysRemaining} Day{status.daysRemaining > 1 ? "s" : ""}</strong> ({status.expiryDateStr}). Renew to keep cloud sync active!
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setPricingModalOpen(true)}
              className="px-3 py-1 rounded-xl bg-white text-amber-900 font-extrabold hover:bg-amber-100 active:scale-95 transition shadow-xs cursor-pointer text-xs"
            >
              ⚡ Renew Now
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="size-6 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center cursor-pointer text-xs"
              title="Dismiss for this session"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* If expired or suspended, or manually triggered, show paywall modal */}
      {(status.isExpired || pricingModalOpen) && (
        <PricingPlansModal
          user={user}
          userProfile={profile}
          config={config}
          open={status.isExpired || pricingModalOpen}
          onClose={() => setPricingModalOpen(false)}
          isExpired={status.isExpired}
        />
      )}
    </>
  );
}
