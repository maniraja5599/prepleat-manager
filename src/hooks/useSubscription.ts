import { useState, useEffect } from "react";
import { onAppAuthStateChanged, getCurrentAppUser, type AppUser } from "@/integrations/firebase/client";
import {
  subscribeToUserProfile,
  checkSubscriptionStatus,
  isDemoUser,
  DEMO_MAX_BOOKINGS,
  getCachedUserProfile,
  setCachedUserProfile,
  type UserProfile,
} from "@/lib/subscription";
import { useStore } from "@/lib/store";

export function useSubscription() {
  const [user, setUser] = useState<AppUser | null>(() => getCurrentAppUser());
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const u = getCurrentAppUser();
    return u?.id ? getCachedUserProfile(u.id) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const u = getCurrentAppUser();
    if (!u) return true;
    if (u.isAnonymous) return false;
    return !getCachedUserProfile(u.id);
  });

  const bookings = useStore((s) => s.bookings);

  useEffect(() => {
    const unsub = onAppAuthStateChanged((u) => {
      setUser(u);
      if (u && !u.isAnonymous) {
        // Fast path: populate from local cache immediately to prevent flash
        const cached = getCachedUserProfile(u.id);
        if (cached) {
          setProfile(cached);
          setIsLoading(false);
        }
        // Live subscription to Firestore
        const unsubProfile = subscribeToUserProfile(u.id, (p) => {
          setProfile(p);
          setIsLoading(false);
          if (p) {
            setCachedUserProfile(u.id, p);
          }
        });
        return () => unsubProfile();
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const isDemoRaw = isDemoUser(user, profile);
  // While profile is loading for an authenticated user, never treat as demo or lock UI
  const isDemo = isLoading ? false : isDemoRaw;
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
    isLoading,
    openUpgradeModal,
  };
}
