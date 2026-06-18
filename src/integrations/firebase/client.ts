import { initializeApp, getApps } from "firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

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
export const db = app 
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    }) 
  : null;

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

export function waitForAppUser(timeoutMs = 1200): Promise<AppUser | null> {
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

export async function signInWithGoogle() {
  if (!auth) throw new Error("Firebase is not configured. Add VITE_FIREBASE_* values in .env.");
  localStorage.removeItem("local_guest_session");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
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
  if (auth?.currentUser) await firebaseSignOut(auth);
  window.dispatchEvent(new Event("local-auth-change"));
}

export async function resetPassword(email: string) {
  if (!auth) throw new Error("Firebase is not configured. Add VITE_FIREBASE_* values in .env.");
  return sendPasswordResetEmail(auth, email);
}
