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

export function SubscriptionGuard() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<SystemSubscriptionConfig>(DEFAULT_CONFIG);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

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

  return (
    <>
      {/* If expired or suspended, show paywall modal */}
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
