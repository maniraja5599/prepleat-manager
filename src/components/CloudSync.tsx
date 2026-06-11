import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";

/**
 * Lightweight one-way mirror: pushes the local zustand state to Supabase
 * (app_settings.data) whenever the user changes something. On first mount
 * it pulls any existing cloud snapshot so the user sees their data on a
 * fresh device. This is intentionally simple — full per-row sync comes
 * in the next phase.
 */
export function CloudSync() {
  const pulled = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pull on first authenticated mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("app_settings")
        .select("data")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.data && typeof data.data === "object") {
        const snap = data.data as Record<string, unknown>;
        const localEmpty =
          useStore.getState().bookings.length === 0 &&
          useStore.getState().customers.length === 0;
        if (localEmpty) {
          useStore.setState({
            customers: (snap.customers as never) ?? [],
            bookings: (snap.bookings as never) ?? [],
            payments: (snap.payments as never) ?? [],
            settings: { ...useStore.getState().settings, ...(snap.settings as object ?? {}) },
          });
        }
      }
      pulled.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  // Push on any state change (debounced)
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      if (!pulled.current) return;
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(async () => {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        await supabase.from("app_settings").upsert({
          user_id: auth.user.id,
          data: JSON.parse(JSON.stringify({
            customers: state.customers,
            bookings: state.bookings,
            payments: state.payments,
            settings: state.settings,
          })),
        });
      }, 800);
    });
    return () => { unsub(); if (debounce.current) clearTimeout(debounce.current); };
  }, []);

  return null;
}
