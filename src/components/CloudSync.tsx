import { useEffect, useRef, useState } from "react";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db, onAppAuthStateChanged, waitForAppUser, type AppUser } from "@/integrations/firebase/client";
import { useStore, type Booking, type Customer, type Payment, type Tombstone } from "@/lib/store";

type Snapshot = {
  customers?: Customer[];
  bookings?: Booking[];
  payments?: Payment[];
  expenses?: ReturnType<typeof useStore.getState>["expenses"];
  extraIncomes?: ReturnType<typeof useStore.getState>["extraIncomes"];
  trash?: ReturnType<typeof useStore.getState>["trash"];
  activity?: ReturnType<typeof useStore.getState>["activity"];
  settings?: Partial<ReturnType<typeof useStore.getState>["settings"]>;
  tombstones?: Tombstone[];
};

type SyncStatus = "synced" | "syncing" | "offline" | "error";

function mergeById<T extends { id: string }>(
  a: T[] = [],
  b: T[] = [],
  pickNewer?: (x: T, y: T) => T,
): T[] {
  const map = new Map<string, T>();
  for (const x of a) map.set(x.id, x);
  for (const y of b) {
    const existing = map.get(y.id);
    map.set(y.id, existing && pickNewer ? pickNewer(existing, y) : y);
  }
  return Array.from(map.values());
}

const bookingTs = (b: Booking) =>
  b.updatedAt || b.deliveredAt || b.workDoneAt || b.completedAt || b.receivedAt || b.createdAt || "";
const customerTs = (c: Customer) => c.updatedAt || c.createdAt || "";
const paymentTs = (p: Payment) => p.updatedAt || p.date || "";
const genericTs = (x: { updatedAt?: string; date?: string; createdAt?: string }) =>
  x.updatedAt || x.date || x.createdAt || "";

function mergeSnapshots(local: Snapshot, cloud: Snapshot) {
  let customers = mergeById(local.customers, cloud.customers, (x, y) =>
    customerTs(y) > customerTs(x) ? y : x,
  );
  let payments = mergeById(local.payments, cloud.payments, (x, y) =>
    paymentTs(y) > paymentTs(x) ? y : x,
  );
  let bookings = mergeById(local.bookings, cloud.bookings, (x, y) =>
    bookingTs(y) > bookingTs(x) ? y : x,
  );

  const tombMap = new Map<string, Tombstone>();
  for (const t of [...(local.tombstones ?? []), ...(cloud.tombstones ?? [])]) {
    const key = `${t.type}:${t.id}`;
    const existing = tombMap.get(key);
    if (!existing || t.ts > existing.ts) tombMap.set(key, t);
  }

  const alive = (type: Tombstone["type"], id: string, ts: string) => {
    const key = `${type}:${id}`;
    const tombstone = tombMap.get(key);
    if (!tombstone) return true;
    if (ts > tombstone.ts) {
      tombMap.delete(key);
      return true;
    }
    return false;
  };

  customers = customers.filter((c) => alive("customer", c.id, customerTs(c)));
  bookings = bookings.filter((b) => alive("booking", b.id, bookingTs(b)));
  payments = payments.filter((p) => alive("payment", p.id, paymentTs(p)));

  const paidByBooking = new Map<string, number>();
  for (const p of payments) {
    paidByBooking.set(p.bookingId, (paidByBooking.get(p.bookingId) ?? 0) + (p.amount || 0));
  }
  bookings = bookings.map((b) => {
    const advancePaid = Math.max(b.advancePaid ?? 0, paidByBooking.get(b.id) ?? 0);
    const status = advancePaid >= b.totalAmount && b.status === "pending" ? "completed" : b.status;
    return { ...b, advancePaid, status };
  });

  const trash = mergeById(
    (local.trash ?? []).map((t) => ({ ...t, id: t.booking.id })),
    (cloud.trash ?? []).map((t) => ({ ...t, id: t.booking.id })),
    (x, y) => ((y.deletedAt ?? "") > (x.deletedAt ?? "") ? y : x),
  ).map(({ id: _id, ...rest }) => rest);

  const activity = mergeById(local.activity ?? [], cloud.activity ?? [], (x, y) =>
    (y.ts ?? "") > (x.ts ?? "") ? y : x,
  )
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, 200);

  return {
    customers,
    bookings,
    payments,
    expenses: mergeById(local.expenses, cloud.expenses, (x, y) =>
      genericTs(y) > genericTs(x) ? y : x,
    ),
    extraIncomes: mergeById(local.extraIncomes, cloud.extraIncomes, (x, y) =>
      genericTs(y) > genericTs(x) ? y : x,
    ),
    trash,
    activity,
    settings: { ...(local.settings ?? {}), ...(cloud.settings ?? {}) },
    tombstones: Array.from(tombMap.values())
      .sort((a, b) => (a.ts < b.ts ? 1 : -1))
      .slice(0, 1000),
  };
}

function makeSnapshot(): Snapshot {
  const state = useStore.getState();
  return JSON.parse(
    JSON.stringify({
      customers: state.customers,
      bookings: state.bookings,
      payments: state.payments,
      expenses: state.expenses,
      extraIncomes: state.extraIncomes,
      trash: state.trash,
      activity: state.activity,
      settings: state.settings,
      tombstones: state.tombstones,
    }),
  );
}

function stateDoc(user: AppUser) {
  if (!db) return null;
  return doc(db, "users", user.id, "app", "state");
}

export function CloudSync() {
  const pulledOnce = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingRemote = useRef(false);
  const dirty = useRef(false);
  const currentUser = useRef<AppUser | null>(null);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced",
  );
  const [showStatus, setShowStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__syncStatus = { syncStatus, showStatus, errorMessage };
    window.dispatchEvent(
      new CustomEvent("sync-status-update", { detail: { syncStatus, showStatus, errorMessage } }),
    );
  }, [syncStatus, showStatus, errorMessage]);

  const clearHideTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };

  const fadeSynced = () => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setShowStatus(false), 2000);
  };

  const setError = (message: string) => {
    setSyncStatus("error");
    setErrorMessage(message);
    setShowStatus(true);
    clearHideTimer();
    hideTimer.current = setTimeout(() => setShowStatus(false), 3000);
  };

  const pullAndMerge = useRef(async () => {
    const user = currentUser.current ?? (await waitForAppUser());
    currentUser.current = user;
    if (!user || user.isAnonymous) {
      pulledOnce.current = true;
      setSyncStatus("synced");
      setShowStatus(false);
      return;
    }
    const ref = stateDoc(user);
    if (!ref) {
      setError("Firebase is not configured. Add Firebase settings in .env.");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
      setShowStatus(true);
      return;
    }
    clearHideTimer();
    setSyncStatus("syncing");
    setErrorMessage("");
    setShowStatus(true);
    try {
      const snap = await getDoc(ref);
      const cloud = (snap.data()?.data ?? {}) as Snapshot;
      if (snap.exists()) {
        const state = useStore.getState();
        const merged = mergeSnapshots(makeSnapshot(), cloud);
        isApplyingRemote.current = true;
        useStore.setState({
          customers: merged.customers,
          bookings: merged.bookings,
          payments: merged.payments,
          expenses: merged.expenses,
          extraIncomes: merged.extraIncomes,
          trash: merged.trash,
          activity: merged.activity,
          tombstones: merged.tombstones,
          settings: { ...state.settings, ...(merged.settings ?? {}) },
        });
        isApplyingRemote.current = false;
      }
      pulledOnce.current = true;
      setSyncStatus("synced");
      fadeSynced();
    } catch (error) {
      isApplyingRemote.current = false;
      setError(error instanceof Error ? error.message : "Failed to download cloud data");
    }
  }).current;

  const pushNow = useRef(async () => {
    const user = currentUser.current ?? (await waitForAppUser());
    currentUser.current = user;
    if (!user || user.isAnonymous) {
      dirty.current = false;
      setSyncStatus("synced");
      setShowStatus(false);
      return;
    }
    const ref = stateDoc(user);
    if (!ref) {
      setError("Firebase is not configured. Add Firebase settings in .env.");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
      setShowStatus(true);
      return;
    }
    clearHideTimer();
    setSyncStatus("syncing");
    setErrorMessage("");
    setShowStatus(true);
    try {
      await setDoc(ref, { data: makeSnapshot(), updatedAt: serverTimestamp() }, { merge: true });
      dirty.current = false;
      setSyncStatus("synced");
      fadeSynced();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to upload local data");
    }
  }).current;

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;
    const unsubscribeAuth = onAppAuthStateChanged((user) => {
      currentUser.current = user;
      pulledOnce.current = false;
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      unsubscribeSnapshot = undefined;
      if (!user || user.isAnonymous) {
        setSyncStatus("synced");
        setShowStatus(false);
        pulledOnce.current = true;
        return;
      }
      const ref = stateDoc(user);
      if (!ref) {
        setError("Firebase is not configured. Add Firebase settings in .env.");
        return;
      }
      void pullAndMerge();
      unsubscribeSnapshot = onSnapshot(
        ref,
        (snapshot) => {
          if (!snapshot.exists() || isApplyingRemote.current) return;
          const cloud = (snapshot.data()?.data ?? {}) as Snapshot;
          const state = useStore.getState();
          const merged = mergeSnapshots(makeSnapshot(), cloud);
          isApplyingRemote.current = true;
          useStore.setState({
            customers: merged.customers,
            bookings: merged.bookings,
            payments: merged.payments,
            expenses: merged.expenses,
            extraIncomes: merged.extraIncomes,
            trash: merged.trash,
            activity: merged.activity,
            tombstones: merged.tombstones,
            settings: { ...state.settings, ...(merged.settings ?? {}) },
          });
          isApplyingRemote.current = false;
        },
        (error) => setError(error.message),
      );
    });

    const retry = () => {
      void (async () => {
        await pullAndMerge();
        if (dirty.current) await pushNow();
      })();
    };
    const online = () => retry();
    const offline = () => {
      clearHideTimer();
      setSyncStatus("offline");
      setShowStatus(true);
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("focus", retry);
    window.addEventListener("sync-retry", retry);

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("focus", retry);
      window.removeEventListener("sync-retry", retry);
      clearHideTimer();
    };
  }, [pullAndMerge, pushNow]);

  useEffect(() => {
    const unsub = useStore.subscribe(() => {
      if (isApplyingRemote.current) return;
      dirty.current = true;
      if (!pulledOnce.current) return;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => {
        void pushNow();
      }, 800);
    });
    return () => {
      unsub();
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [pushNow]);

  return null;
}
