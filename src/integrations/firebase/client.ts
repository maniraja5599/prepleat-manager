import { initializeApp, getApps } from "firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { Capacitor } from "@capacitor/core";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);

const app = isFirebaseConfigured
  ? getApps()[0] || initializeApp(firebaseConfig)
  : null;

export const auth = app ? getAuth(app) : null;
const globalForFirebase = globalThis as unknown as {
  db: any;
};

let firestoreInstance: any = null;
if (app) {
  if (globalForFirebase.db) {
    firestoreInstance = globalForFirebase.db;
  } else {
    try {
      firestoreInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
      });
    } catch {
      try {
        firestoreInstance = getFirestore(app);
      } catch {
        firestoreInstance = null;
      }
    }
    globalForFirebase.db = firestoreInstance;
  }
}

export const db = firestoreInstance;

export type AppUser = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
};

const localGuestUser: AppUser = {
  id: "local-guest",
  email: "guest@local.device",
  isAnonymous: true,
};

export function toAppUser(user: User | null): AppUser | null {
  if (!user) return null;
  return {
    id: user.uid,
    email: user.email,
    isAnonymous: user.isAnonymous,
  };
}

export function getLocalGuestUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("local_guest_session") === "true" ? localGuestUser : null;
}

export function getCurrentAppUser(): AppUser | null {
  return toAppUser(auth?.currentUser ?? null) ?? getLocalGuestUser();
}

export function waitForAppUser(timeoutMs = 3500): Promise<AppUser | null> {
  const localGuest = getLocalGuestUser();
  if (localGuest) return Promise.resolve(localGuest);
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(toAppUser(auth.currentUser));

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe();
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("last_known_user");
        if (stored) {
          try {
            return resolve(JSON.parse(stored));
          } catch (e) {}
        }
      }
      resolve(getLocalGuestUser());
    }, timeoutMs);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(toAppUser(user) ?? getLocalGuestUser());
    });
  });
}

export function onAppAuthStateChanged(callback: (user: AppUser | null) => void) {
  if (!auth) {
    callback(getLocalGuestUser());
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => callback(toAppUser(user) ?? getLocalGuestUser()));
}

export async function signInWithGoogle(): Promise<AppUser | null> {
  if (!auth) throw new Error("Firebase is not configured. Add VITE_FIREBASE_* values in .env.");
  localStorage.removeItem("local_guest_session");

  // 1. If running on native mobile device (Android / iOS), use Native Google Sign-In dialog
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      const result = await FirebaseAuthentication.signInWithGoogle();
      if (result?.credential?.idToken) {
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        const userCred = await signInWithCredential(auth, credential);
        return toAppUser(userCred.user);
      }
      if (result?.user) {
        return {
          id: result.user.uid,
          email: result.user.email ?? null,
          isAnonymous: result.user.isAnonymous ?? false,
        };
      }
    } catch (nativeErr: any) {
      console.warn("Native Google sign-in failed, trying web fallback:", nativeErr);
      if (nativeErr?.message?.includes("canceled") || nativeErr?.message?.includes("cancelled")) {
        throw new Error("Google sign-in was cancelled");
      }
    }
  }

  // 2. Web browser popup / redirect flow
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const res = await signInWithPopup(auth, provider);
    return toAppUser(res.user);
  } catch (error: any) {
    if (
      error.code === "auth/popup-blocked" ||
      error.code === "auth/popup-closed-by-user" ||
      error.code === "auth/cancelled-popup-request" ||
      error.code === "auth/unauthorized-domain" ||
      error.code === "auth/operation-not-supported-in-this-environment"
    ) {
      console.warn("Popup blocked or unsupported, falling back to redirect:", error.code);
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export async function checkRedirectResult(): Promise<AppUser | null> {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      localStorage.removeItem("local_guest_session");
      return toAppUser(result.user);
    }
  } catch (error) {
    console.error("Error processing Google redirect result:", error);
  }
  return null;
}

export async function signInWithEmail(email: string, password: string) {
  if (!auth) throw new Error("Firebase is not configured. Add VITE_FIREBASE_* values in .env.");
  localStorage.removeItem("local_guest_session");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function createAccountWithEmail(email: string, password: string) {
  if (!auth) throw new Error("Firebase is not configured. Add VITE_FIREBASE_* values in .env.");
  localStorage.removeItem("local_guest_session");
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInAsGuest() {
  if (auth) {
    try {
      return await signInAnonymously(auth);
    } catch (error) {
      console.warn("Firebase anonymous sign-in failed, using local guest mode.", error);
    }
  }
  localStorage.setItem("local_guest_session", "true");
  window.dispatchEvent(new Event("local-auth-change"));
  return null;
}

export async function signOut() {
  localStorage.removeItem("local_guest_session");
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      await FirebaseAuthentication.signOut();
    } catch (e) {
      console.warn("Native sign out error:", e);
    }
  }
  if (auth?.currentUser) await firebaseSignOut(auth);
  window.dispatchEvent(new Event("local-auth-change"));
}

export async function resetPassword(email: string) {
  if (!auth) throw new Error("Firebase is not configured. Add VITE_FIREBASE_* values in .env.");
  return sendPasswordResetEmail(auth, email);
}
