import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore, type Booking, type Customer, type Payment } from "@/lib/store";

/**
 * Two-way cloud sync for the local zustand store.
 *
 * Strategy:
 *  - On mount, on tab focus, on auth change, and via Postgres realtime on the
 *    user's app_settings row → PULL the cloud snapshot and MERGE with local.
 *  - On any local state change → PUSH the merged snapshot (debounced), but
 *    first re-pull to avoid clobbering a newer write from another device.
 *  - Merge is union-by-id across customers, bookings, payments, trash, activity.
 *    Booking.advancePaid is recomputed from the merged payments list so the two
 *    devices always agree on what's been paid.
 */

type Snapshot = {
  customers?: Customer[];
  bookings?: Booking[];
  payments?: Payment[];
  trash?: ReturnType<typeof useStore.getState>["trash"];
  activity?: ReturnType<typeof useStore.getState>["activity"];
  settings?: Partial<ReturnType<typeof useStore.getState>["settings"]>;
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

function mergeSnapshots(local: Snapshot, cloud: Snapshot): Required<Omit<Snapshot, "settings">> & { settings: Snapshot["settings"] } {
  const customers = mergeById(local.customers, cloud.customers, (x, y) =>
    (y.createdAt ?? "") > (x.createdAt ?? "") ? y : x,
  );
  const payments = mergeById(local.payments, cloud.payments, (x, y) =>
    (y.date ?? "") > (x.date ?? "") ? y : x,
  );
  // Bookings: merge by id, prefer the one with the latest workflow timestamp.
  const bookingScore = (b: Booking) =>
    b.deliveredAt || b.workDoneAt || b.completedAt || b.receivedAt || b.createdAt || "";
  let bookings = mergeById(local.bookings ?? [], cloud.bookings ?? [], (x, y) =>
    bookingScore(y) > bookingScore(x) ? y : x,
  );
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

  return { customers, bookings, payments, trash, activity, settings };
}

export function CloudSync() {
  const pulledOnce = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastServerUpdatedAt = useRef<string | null>(null);
  const isApplyingRemote = useRef(false);

  // ---- PULL --------------------------------------------------------------
  const pullAndMerge = useRef(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: row } = await supabase
      .from("app_settings")
      .select("data, updated_at")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (!row?.data || typeof row.data !== "object") {
      pulledOnce.current = true;
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
    };
    const merged = mergeSnapshots(local, cloud);
    isApplyingRemote.current = true;
    useStore.setState({
      customers: merged.customers,
      bookings: merged.bookings,
      payments: merged.payments,
      trash: merged.trash,
      activity: merged.activity,
      settings: { ...state.settings, ...(merged.settings ?? {}) },
    });
    isApplyingRemote.current = false;
    lastServerUpdatedAt.current = row.updated_at ?? null;
    pulledOnce.current = true;
  }).current;

  // ---- PUSH --------------------------------------------------------------
  const pushNow = useRef(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    // Re-check cloud for newer writes before overwriting.
    const { data: row } = await supabase
      .from("app_settings")
      .select("updated_at")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (row?.updated_at && lastServerUpdatedAt.current && row.updated_at > lastServerUpdatedAt.current) {
      // Another device wrote since we last pulled — pull & merge first.
      await pullAndMerge();
    }
    const state = useStore.getState();
    const payload = JSON.parse(JSON.stringify({
      customers: state.customers,
      bookings: state.bookings,
      payments: state.payments,
      trash: state.trash,
      activity: state.activity,
      settings: state.settings,
    }));
    const { data: upserted } = await supabase
      .from("app_settings")
      .upsert({ user_id: auth.user.id, data: payload })
      .select("updated_at")
      .maybeSingle();
    if (upserted?.updated_at) lastServerUpdatedAt.current = upserted.updated_at;
  }).current;

  // ---- LIFECYCLE ---------------------------------------------------------
  useEffect(() => {
    void pullAndMerge();

    const onVisibility = () => {
      if (document.visibilityState === "visible") void pullAndMerge();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") void pullAndMerge();
    });

    // Realtime: react to writes from other devices on our own row.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      channel = supabase
        .channel(`app_settings:${auth.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "app_settings", filter: `user_id=eq.${auth.user.id}` },
          () => { void pullAndMerge(); },
        )
        .subscribe();
    })();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
      authSub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [pullAndMerge]);

  useEffect(() => {
    const unsub = useStore.subscribe(() => {
      if (!pulledOnce.current) return;
      if (isApplyingRemote.current) return;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => { void pushNow(); }, 800);
    });
    return () => {
      unsub();
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [pushNow]);

  return null;
}
