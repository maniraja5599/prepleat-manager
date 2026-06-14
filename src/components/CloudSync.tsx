import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore, type Booking, type Customer, type Payment, type Tombstone } from "@/lib/store";
import { CloudOff, RefreshCw, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Offline-first two-way cloud sync for the local zustand store.
 *
 *  - The local store (persisted to localStorage) is the source of truth while
 *    offline — the app keeps working with no internet.
 *  - On mount, tab focus, reconnect, and via Postgres realtime on the user's
 *    app_settings row → PULL the cloud snapshot and MERGE with local.
 *  - On any local change → mark dirty and PUSH (debounced). If the push fails
 *    (offline / network error) it stays dirty and retries automatically when
 *    the device comes back online.
 *  - Merge is per-record last-write-wins using each record's updatedAt, so
 *    edits from two devices never clobber each other unless they edited the
 *    exact same record (then the most recent edit wins).
 *  - Deletes propagate via tombstones, so a record deleted on one device
 *    cannot be resurrected by an older copy from another device.
 */

type Snapshot = {
  customers?: Customer[];
  bookings?: Booking[];
  payments?: Payment[];
  trash?: ReturnType<typeof useStore.getState>["trash"];
  activity?: ReturnType<typeof useStore.getState>["activity"];
  settings?: Partial<ReturnType<typeof useStore.getState>["settings"]>;
  tombstones?: Tombstone[];
};

function mergeById<T extends { id: string }>(
  a: T[] = [],
  b: T[] = [],
  pickNewer?: (x: T, y: T) => T,
): T[] {
  const map = new Map<string, T>();
  for (const x of a) map.set(x.id, x);
  for (const y of b) {
    const existing = map.get(y.id);
    if (!existing) map.set(y.id, y);
    else map.set(y.id, pickNewer ? pickNewer(existing, y) : y);
  }
  return Array.from(map.values());
}

const bookingTs = (b: Booking) =>
  b.updatedAt ||
  b.deliveredAt ||
  b.workDoneAt ||
  b.completedAt ||
  b.receivedAt ||
  b.createdAt ||
  "";
const customerTs = (c: Customer) => c.updatedAt || c.createdAt || "";
const paymentTs = (p: Payment) => p.updatedAt || p.date || "";

function mergeSnapshots(local: Snapshot, cloud: Snapshot) {
  let customers = mergeById(local.customers, cloud.customers, (x, y) =>
    customerTs(y) > customerTs(x) ? y : x,
  );
  let payments = mergeById(local.payments, cloud.payments, (x, y) =>
    paymentTs(y) > paymentTs(x) ? y : x,
  );
  let bookings = mergeById(local.bookings ?? [], cloud.bookings ?? [], (x, y) =>
    bookingTs(y) > bookingTs(x) ? y : x,
  );

  // Tombstones: union both sides, newest wins per record.
  const tombMap = new Map<string, Tombstone>();
  for (const t of [...(local.tombstones ?? []), ...(cloud.tombstones ?? [])]) {
    const key = `${t.type}:${t.id}`;
    const ex = tombMap.get(key);
    if (!ex || t.ts > ex.ts) tombMap.set(key, t);
  }
  // Apply tombstones: a record only survives if it was touched AFTER the
  // delete (i.e. restored on another device) — in that case drop the
  // tombstone so the restore propagates too.
  const alive = (type: Tombstone["type"], id: string, ts: string) => {
    const key = `${type}:${id}`;
    const t = tombMap.get(key);
    if (!t) return true;
    if (ts > t.ts) {
      tombMap.delete(key);
      return true;
    }
    return false;
  };
  customers = customers.filter((c) => alive("customer", c.id, customerTs(c)));
  bookings = bookings.filter((b) => alive("booking", b.id, bookingTs(b)));
  payments = payments.filter((p) => alive("payment", p.id, paymentTs(p)));
  const tombstones = Array.from(tombMap.values())
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, 1000);

  // Recompute advancePaid from merged payments so both devices agree.
  const paidByBooking = new Map<string, number>();
  for (const p of payments) {
    paidByBooking.set(p.bookingId, (paidByBooking.get(p.bookingId) ?? 0) + (p.amount || 0));
  }
  bookings = bookings.map((b) => {
    const paid = paidByBooking.get(b.id) ?? 0;
    const advancePaid = Math.max(b.advancePaid ?? 0, paid);
    let status = b.status;
    if (advancePaid >= b.totalAmount && status === "pending") status = "completed";
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

  // Settings: prefer cloud values where present, fall back to local.
  const settings = { ...(local.settings ?? {}), ...(cloud.settings ?? {}) };

  return { customers, bookings, payments, trash, activity, settings, tombstones };
}

export function CloudSync() {
  const pulledOnce = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastServerUpdatedAt = useRef<string | null>(null);
  const isApplyingRemote = useRef(false);
  const dirty = useRef(false);

  // Sync state variables
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline" | "error">(
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced",
  );
  const [showStatus, setShowStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__syncStatus = { syncStatus, showStatus, errorMessage };
      window.dispatchEvent(
        new CustomEvent("sync-status-update", { detail: { syncStatus, showStatus, errorMessage } }),
      );
    }
  }, [syncStatus, showStatus, errorMessage]);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const triggerSyncedFadeOut = () => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => {
      setShowStatus(false);
    }, 2000);
  };

  const triggerErrorFadeOut = () => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus("offline");
      } else {
        setShowStatus(false);
      }
    }, 3000);
  };

  // ---- PULL --------------------------------------------------------------
  const pullAndMerge = useRef(async () => {
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus("offline");
        setShowStatus(true);
        return;
      }
      clearHideTimer();
      setSyncStatus("syncing");
      setErrorMessage("");
      setShowStatus(true);

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setShowStatus(false);
        return;
      }
      if (auth.user.is_anonymous) {
        setSyncStatus("synced");
        setErrorMessage("");
        setShowStatus(false);
        pulledOnce.current = true;
        return;
      }
      const { data: row, error } = await supabase
        .from("app_settings")
        .select("data, updated_at")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (error) {
        setSyncStatus("error");
        setErrorMessage(error.message || "Failed to retrieve cloud data");
        triggerErrorFadeOut();
        return; // offline / network error — keep local data, retry later
      }
      if (!row?.data || typeof row.data !== "object") {
        pulledOnce.current = true;
        setSyncStatus("synced");
        setErrorMessage("");
        triggerSyncedFadeOut();
        return;
      }
      const cloud = row.data as Snapshot;
      const state = useStore.getState();
      const local: Snapshot = {
        customers: state.customers,
        bookings: state.bookings,
        payments: state.payments,
        trash: state.trash,
        activity: state.activity,
        settings: state.settings,
        tombstones: state.tombstones,
      };
      const merged = mergeSnapshots(local, cloud);
      isApplyingRemote.current = true;
      useStore.setState({
        customers: merged.customers,
        bookings: merged.bookings,
        payments: merged.payments,
        trash: merged.trash,
        activity: merged.activity,
        tombstones: merged.tombstones,
        settings: { ...state.settings, ...(merged.settings ?? {}) },
      });
      isApplyingRemote.current = false;
      lastServerUpdatedAt.current = row.updated_at ?? null;
      pulledOnce.current = true;

      setSyncStatus("synced");
      setErrorMessage("");
      triggerSyncedFadeOut();
    } catch (err: any) {
      // Offline — local store keeps working; we retry on reconnect.
      isApplyingRemote.current = false;
      setSyncStatus("error");
      setErrorMessage(err?.message || String(err));
      triggerErrorFadeOut();
    }
  }).current;

  // ---- PUSH --------------------------------------------------------------
  const pushNow = useRef(async () => {
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus("offline");
        setShowStatus(true);
        return; // stay dirty, retry on reconnect
      }
      clearHideTimer();
      setSyncStatus("syncing");
      setErrorMessage("");
      setShowStatus(true);

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setShowStatus(false);
        return;
      }
      if (auth.user.is_anonymous) {
        setSyncStatus("synced");
        setErrorMessage("");
        setShowStatus(false);
        dirty.current = false;
        return;
      }
      // Re-check cloud for newer writes before overwriting.
      const { data: row } = await supabase
        .from("app_settings")
        .select("updated_at")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (
        row?.updated_at &&
        lastServerUpdatedAt.current &&
        row.updated_at > lastServerUpdatedAt.current
      ) {
        // Another device wrote since we last pulled — pull & merge first.
        await pullAndMerge();
      }
      const state = useStore.getState();
      const payload = JSON.parse(
        JSON.stringify({
          customers: state.customers,
          bookings: state.bookings,
          payments: state.payments,
          trash: state.trash,
          activity: state.activity,
          settings: state.settings,
          tombstones: state.tombstones,
        }),
      );
      const { data: upserted, error } = await supabase
        .from("app_settings")
        .upsert({ user_id: auth.user.id, data: payload })
        .select("updated_at")
        .maybeSingle();
      if (error) {
        setSyncStatus("error");
        setErrorMessage(error.message || "Failed to upload local database changes");
        triggerErrorFadeOut();
        return; // stay dirty, retry on reconnect
      }
      if (upserted?.updated_at) lastServerUpdatedAt.current = upserted.updated_at;
      dirty.current = false;

      setSyncStatus("synced");
      setErrorMessage("");
      triggerSyncedFadeOut();
    } catch (err: any) {
      // Offline — stay dirty, retry when back online.
      setSyncStatus("error");
      setErrorMessage(err?.message || String(err));
      triggerErrorFadeOut();
    }
  }).current;

  // ---- LIFECYCLE ---------------------------------------------------------
  useEffect(() => {
    void pullAndMerge();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void (async () => {
          await pullAndMerge();
          if (dirty.current) await pushNow();
        })();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    // Internet came back → pull latest, then push anything saved offline.
    const onOnline = () => {
      setSyncStatus("syncing");
      setShowStatus(true);
      void (async () => {
        await pullAndMerge();
        if (dirty.current) await pushNow();
      })();
    };
    const onOffline = () => {
      clearHideTimer();
      setSyncStatus("offline");
      setShowStatus(true);
    };
    const onRetry = () => {
      setSyncStatus("syncing");
      setErrorMessage("");
      setShowStatus(true);
      void (async () => {
        await pullAndMerge();
        if (dirty.current) await pushNow();
      })();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("sync-retry", onRetry);

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") void pullAndMerge();
    });

    // Realtime: react to writes from other devices on our own row.
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || auth.user.is_anonymous || cancelled) return;
      const topic = `app_settings:${auth.user.id}`;
      // Remove any stale channel with the same topic before re-creating —
      // re-using a subscribed channel throws when adding callbacks.
      for (const c of supabase.getChannels()) {
        if (c.topic === `realtime:${topic}`) {
          await supabase.removeChannel(c);
        }
      }
      if (cancelled) return;
      channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "app_settings",
            filter: `user_id=eq.${auth.user.id}`,
          },
          () => {
            void pullAndMerge();
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("sync-retry", onRetry);
      authSub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
      clearHideTimer();
    };
  }, [pullAndMerge, pushNow]);

  useEffect(() => {
    const unsub = useStore.subscribe(() => {
      if (isApplyingRemote.current) return;
      dirty.current = true; // remember there's unsynced local work (offline-safe)
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
