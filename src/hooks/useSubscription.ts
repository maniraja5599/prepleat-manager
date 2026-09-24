import { useState, useEffect } from "react";
import { onAppAuthStateChanged, getCurrentAppUser, type AppUser } from "@/integrations/firebase/client";
import {
  subscribeToUserProfile,
  checkSubscriptionStatus,
  isDemoUser,
  DEMO_MAX_BOOKINGS,
  type UserProfile,
} from "@/lib/subscription";
import { useStore } from "@/lib/store";

export function useSubscription() {
  const [user, setUser] = useState<AppUser | null>(() => getCurrentAppUser());
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      const u = getCurrentAppUser();
      if (u?.id) {
        try {
          const cached = localStorage.getItem("user_profile_" + u.id);
          if (cached) return JSON.parse(cached);
        } catch (_) {}
      }
    }
    return null;
  });

  const bookings = useStore((s) => s.bookings);

  useEffect(() => {
    const unsub = onAppAuthStateChanged((u) => {
      setUser(u);
      if (u && !u.isAnonymous) {
        subscribeToUserProfile(u.id, (p) => setProfile(p));
      } else {
        setProfile(null);
      }
    });
    return () => unsub();
  }, []);

  const isDemo = isDemoUser(user, profile);
  const bookingsCount = bookings.length;
  const allowed = !isDemo || bookingsCount < DEMO_MAX_BOOKINGS;
  const remaining = isDemo ? Math.max(0, DEMO_MAX_BOOKINGS - bookingsCount) : Infinity;
  const status = checkSubscriptionStatus(user, profile);

  const openUpgradeModal = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("trigger-pricing-modal"));
    }
  };

  return {
    user,
    profile,
    status,
    isDemo,
    allowed,
    remaining,
    bookingsCount,
    maxLimit: isDemo ? DEMO_MAX_BOOKINGS : Infinity,
    openUpgradeModal,
  };
}
