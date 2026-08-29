import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  arrayUnion,
  increment,
  runTransaction,
} from "firebase/firestore";
import { db, type AppUser } from "@/integrations/firebase/client";

export const SUPER_ADMIN_EMAILS = ["manirajankg@gmail.com"];

export type SubscriptionPlan = "trial" | "monthly" | "yearly" | "lifetime_free" | "suspended";

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: "admin" | "user";
  plan: SubscriptionPlan;
  trialEndsAt: string; // ISO String
  planExpiresAt?: string | null; // ISO String or null
  isApproved: boolean;
  createdAt: string;
  lastLoginAt: string;
  notes?: string;
}

export interface Coupon {
  id: string;
  code: string; // uppercase
  type: "free_days" | "percent_discount" | "lifetime_free";
  value: number; // e.g. 30 days, 365 days, 50% discount
  planScope?: "all" | "monthly" | "yearly";
  maxUses: number; // 0 for unlimited
  usedCount: number;
  usedBy?: string[]; // user UIDs
  expiresAt?: string | null;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

export interface SystemSubscriptionConfig {
  trialDays: number; // default: 30
  monthlyPrice: number; // default: 299
  yearlyPrice: number; // default: 1999
  yearlyOriginalPrice: number; // default: 3588
  supportWhatsapp: string; // e.g. "919000000000"
  supportUpiId?: string; // e.g. "manirajankg@upi"
  cashfreeAppId?: string;
  cashfreeEnv?: "TEST" | "PROD";
}

export const DEFAULT_CONFIG: SystemSubscriptionConfig = {
  trialDays: 30,
  monthlyPrice: 299,
  yearlyPrice: 1999,
  yearlyOriginalPrice: 3588,
  supportWhatsapp: "919000000000",
  supportUpiId: "manirajankg@upi",
  cashfreeEnv: "TEST",
};

/**
 * Check if a user is a super admin
 */
export function isSuperAdmin(user: AppUser | null | undefined): boolean {
  if (!user || !user.email) return false;
  return SUPER_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === user.email?.toLowerCase().trim());
}

/**
 * Ensure user profile exists in Firestore and return it.
 * Grants instant 30-day trial for new users or Lifetime Admin for developer.
 */
export async function ensureUserProfile(user: AppUser): Promise<UserProfile | null> {
  if (!db || !user.id || user.isAnonymous) return null;

  try {
    const userDocRef = doc(db, "user_profiles", user.id);
    const snap = await getDoc(userDocRef);

    const now = new Date();
    const isAdmin = isSuperAdmin(user);

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      // If admin, ensure role is always admin
      if (isAdmin && (data.role !== "admin" || data.plan !== "lifetime_free")) {
        await updateDoc(userDocRef, {
          role: "admin",
          plan: "lifetime_free",
          isApproved: true,
          lastLoginAt: now.toISOString(),
        });
        return {
          ...data,
          role: "admin",
          plan: "lifetime_free",
          isApproved: true,
          lastLoginAt: now.toISOString(),
        };
      }
      // Update last login
      await updateDoc(userDocRef, {
        lastLoginAt: now.toISOString(),
        email: user.email || data.email,
      });
      return { ...data, lastLoginAt: now.toISOString() };
    }

    // New User profile initialization
    const trialDays = 30;
    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const newProfile: UserProfile = {
      uid: user.id,
      email: user.email || "no-email@user.com",
      displayName: user.email?.split("@")[0] || "Draping Artist",
      role: isAdmin ? "admin" : "user",
      plan: isAdmin ? "lifetime_free" : "trial",
      trialEndsAt: trialEnd.toISOString(),
      planExpiresAt: isAdmin ? null : trialEnd.toISOString(),
      isApproved: true,
      createdAt: now.toISOString(),
      lastLoginAt: now.toISOString(),
      notes: isAdmin ? "Developer Master Admin" : "Auto 30-Day Trial Signup",
    };

    await setDoc(userDocRef, newProfile);
    return newProfile;
  } catch (err) {
    console.error("Error ensuring user profile:", err);
    return null;
  }
}

/**
 * Subscribe to current user profile changes in real-time
 */
export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
) {
  if (!db || !uid) {
    callback(null);
    return () => {};
  }
  const userDocRef = doc(db, "user_profiles", uid);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn("User profile subscription error:", err);
      callback(null);
    },
  );
}

/**
 * Subscribe to all user profiles (For Developer Admin Panel)
 */
export function subscribeToAllUsers(callback: (users: UserProfile[]) => void) {
  if (!db) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, "user_profiles"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const users: UserProfile[] = [];
      snap.forEach((docSnap) => {
        users.push(docSnap.data() as UserProfile);
      });
      callback(users);
    },
    (err) => {
      console.error("Error fetching all users:", err);
      callback([]);
    },
  );
}

/**
 * Subscribe to system subscription configuration
 */
export function subscribeToSystemConfig(
  callback: (config: SystemSubscriptionConfig) => void,
) {
  if (!db) {
    callback(DEFAULT_CONFIG);
    return () => {};
  }
  const configDocRef = doc(db, "system_config", "subscription");
  return onSnapshot(
    configDocRef,
    (snap) => {
      if (snap.exists()) {
        callback({ ...DEFAULT_CONFIG, ...snap.data() });
      } else {
        callback(DEFAULT_CONFIG);
      }
    },
    (err) => {
      console.warn("Config subscription error:", err);
      callback(DEFAULT_CONFIG);
    },
  );
}

/**
 * Update system subscription config (Admin Only)
 */
export async function updateSystemConfig(updates: Partial<SystemSubscriptionConfig>) {
  if (!db) return;
  const configDocRef = doc(db, "system_config", "subscription");
  await setDoc(configDocRef, updates, { merge: true });
}

/**
 * Subscribe to coupons list (For Admin & Validation)
 */
export function subscribeToCoupons(callback: (coupons: Coupon[]) => void) {
  if (!db) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const coupons: Coupon[] = [];
      snap.forEach((d) => {
        coupons.push({ id: d.id, ...(d.data() as Omit<Coupon, "id">) });
      });
      callback(coupons);
    },
    (err) => {
      console.error("Error fetching coupons:", err);
      callback([]);
    },
  );
}

/**
 * Create a new coupon (Admin Only)
 */
export async function createCoupon(couponData: Omit<Coupon, "id" | "usedCount" | "usedBy" | "createdAt">) {
  if (!db) return;
  const cleanCode = couponData.code.trim().toUpperCase();
  const couponDocRef = doc(db, "coupons", cleanCode);
  const newCoupon: Omit<Coupon, "id"> = {
    ...couponData,
    code: cleanCode,
    usedCount: 0,
    usedBy: [],
    createdAt: new Date().toISOString(),
  };
  await setDoc(couponDocRef, newCoupon);
}

/**
 * Delete a coupon (Admin Only)
 */
export async function deleteCoupon(couponId: string) {
  if (!db) return;
  await deleteDoc(doc(db, "coupons", couponId));
}

/**
 * Toggle coupon active status (Admin Only)
 */
export async function toggleCouponStatus(couponId: string, isActive: boolean) {
  if (!db) return;
  await updateDoc(doc(db, "coupons", couponId), { isActive });
}

/**
 * Admin action: update a user's plan and expiry date
 */
export async function updateUserPlan(
  uid: string,
  plan: SubscriptionPlan,
  daysToAdd?: number,
  customExpiry?: string,
  isApproved: boolean = true,
  notes?: string,
) {
  if (!db || !uid) return;
  const userDocRef = doc(db, "user_profiles", uid);
  const snap = await getDoc(userDocRef);
  if (!snap.exists()) return;

  const current = snap.data() as UserProfile;
  let newExpiry = current.planExpiresAt || new Date().toISOString();

  if (plan === "lifetime_free") {
    newExpiry = null as any;
  } else if (customExpiry) {
    newExpiry = customExpiry;
  } else if (daysToAdd) {
    const baseDate =
      current.planExpiresAt && new Date(current.planExpiresAt) > new Date()
        ? new Date(current.planExpiresAt)
        : new Date();
    baseDate.setDate(baseDate.getDate() + daysToAdd);
    newExpiry = baseDate.toISOString();
  }

  const updates: Partial<UserProfile> = {
    plan,
    planExpiresAt: newExpiry,
    isApproved,
  };
  if (notes !== undefined) updates.notes = notes;

  await updateDoc(userDocRef, updates);
}

/**
 * Redeem a coupon for the current user
 */
export async function redeemCoupon(
  rawCode: string,
  user: AppUser,
): Promise<{ success: boolean; message: string; daysAdded?: number }> {
  if (!db || !user.id) {
    return { success: false, message: "Database connection unavailable." };
  }

  const cleanCode = rawCode.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: "Please enter a valid coupon code." };
  }

  try {
    const couponRef = doc(db, "coupons", cleanCode);
    const userRef = doc(db, "user_profiles", user.id);

    return await runTransaction(db, async (tx) => {
      const couponSnap = await tx.get(couponRef);
      if (!couponSnap.exists()) {
        return { success: false, message: `Coupon code "${cleanCode}" is invalid.` };
      }

      const coupon = couponSnap.data() as Coupon;
      if (!coupon.isActive) {
        return { success: false, message: `Coupon "${cleanCode}" has been disabled.` };
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return { success: false, message: `Coupon "${cleanCode}" has expired.` };
      }

      if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
        return { success: false, message: `Coupon "${cleanCode}" has reached its maximum usage limit.` };
      }

      if (coupon.usedBy && coupon.usedBy.includes(user.id)) {
        return { success: false, message: "You have already redeemed this coupon." };
      }

      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        return { success: false, message: "User profile not found." };
      }

      const userProfile = userSnap.data() as UserProfile;

      let newExpiry: string | null = userProfile.planExpiresAt || new Date().toISOString();
      let newPlan: SubscriptionPlan = userProfile.plan;
      let daysAdded = 0;

      if (coupon.type === "lifetime_free") {
        newPlan = "lifetime_free";
        newExpiry = null;
      } else if (coupon.type === "free_days") {
        daysAdded = coupon.value || 30;
        const baseDate =
          userProfile.planExpiresAt && new Date(userProfile.planExpiresAt) > new Date()
            ? new Date(userProfile.planExpiresAt)
            : new Date();
        baseDate.setDate(baseDate.getDate() + daysAdded);
        newExpiry = baseDate.toISOString();
        if (newPlan === "trial" || newPlan === "suspended") {
          newPlan = daysAdded >= 365 ? "yearly" : "monthly";
        }
      }

      // Update coupon usage
      tx.update(couponRef, {
        usedCount: increment(1),
        usedBy: arrayUnion(user.id),
      });

      // Update user subscription
      tx.update(userRef, {
        plan: newPlan,
        planExpiresAt: newExpiry,
        isApproved: true,
        notes: `Redeemed coupon ${cleanCode} on ${new Date().toLocaleDateString()}`,
      });

      return {
        success: true,
        message:
          coupon.type === "lifetime_free"
            ? `🎉 Lifetime VIP access activated with coupon ${cleanCode}!`
            : `🎉 Successfully added ${daysAdded} days of full access!`,
        daysAdded,
      };
    });
  } catch (err: any) {
    console.error("Coupon redemption error:", err);
    return { success: false, message: err?.message || "Failed to redeem coupon. Please try again." };
  }
}

/**
 * Calculate user's active subscription status and days remaining
 */
export function checkSubscriptionStatus(
  user: AppUser | null,
  profile: UserProfile | null,
): {
  isActive: boolean;
  isTrial: boolean;
  isExpired: boolean;
  isLifetime: boolean;
  isSuspended: boolean;
  daysRemaining: number;
  expiryDateStr: string;
  badgeLabel: string;
  planName: string;
} {
  // Guest mode on local device (always active)
  if (user?.isAnonymous) {
    return {
      isActive: true,
      isTrial: false,
      isExpired: false,
      isLifetime: false,
      isSuspended: false,
      daysRemaining: 999,
      expiryDateStr: "Local Guest",
      badgeLabel: "Guest Mode",
      planName: "Local Guest",
    };
  }

  // Super admin master access
  if (isSuperAdmin(user)) {
    return {
      isActive: true,
      isTrial: false,
      isExpired: false,
      isLifetime: true,
      isSuspended: false,
      daysRemaining: 9999,
      expiryDateStr: "Unlimited Lifetime",
      badgeLabel: "👑 Super Admin",
      planName: "Developer Master VIP",
    };
  }

  if (!profile) {
    return {
      isActive: true,
      isTrial: true,
      isExpired: false,
      isLifetime: false,
      isSuspended: false,
      daysRemaining: 30,
      expiryDateStr: "30 Days Free Trial",
      badgeLabel: "Free Trial",
      planName: "Trial",
    };
  }

  if (profile.plan === "suspended" || !profile.isApproved) {
    return {
      isActive: false,
      isTrial: false,
      isExpired: true,
      isLifetime: false,
      isSuspended: true,
      daysRemaining: 0,
      expiryDateStr: "Account Suspended",
      badgeLabel: "Suspended",
      planName: "Suspended",
    };
  }

  if (profile.plan === "lifetime_free" || profile.role === "admin") {
    return {
      isActive: true,
      isTrial: false,
      isExpired: false,
      isLifetime: true,
      isSuspended: false,
      daysRemaining: 9999,
      expiryDateStr: "Permanent VIP",
      badgeLabel: "VIP Lifetime Free",
      planName: "Lifetime Free VIP",
    };
  }

  const now = new Date();
  const expiryIso = profile.planExpiresAt || profile.trialEndsAt;
  const expiryDate = new Date(expiryIso);
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = diffMs <= 0;

  const isTrial = profile.plan === "trial";
  const planName = isTrial
    ? "Free Trial"
    : profile.plan === "yearly"
      ? "Yearly Plan"
      : "Monthly Plan";

  return {
    isActive: !isExpired,
    isTrial,
    isExpired,
    isLifetime: false,
    isSuspended: false,
    daysRemaining,
    expiryDateStr: expiryDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    badgeLabel: isExpired
      ? "Plan Expired"
      : isTrial
        ? `Trial: ${daysRemaining}d left`
        : `${planName} (${daysRemaining}d)`,
    planName,
  };
}
