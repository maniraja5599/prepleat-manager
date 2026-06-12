import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CloudSync } from "@/components/CloudSync";
import logoAsset from "@/assets/eyas-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingComponent: AuthSplash,
  pendingMs: 0,
  beforeLoad: async () => {
    // First try the cached session (synchronous from localStorage) — this avoids
    // a network round-trip on first launch that can cause a flash of blank page
    // when the app is opened from the Home-screen bookmark.
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // On a cold standalone (PWA) launch the Supabase client may still be
      // re-hydrating its persisted session. Wait briefly for the INITIAL_SESSION
      // event before deciding the user is unauthenticated.
      session = await new Promise((resolve) => {
        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
          if (s) {
            clearTimeout(timer);
            sub.subscription.unsubscribe();
            resolve(s);
          }
        });
        const timer = setTimeout(() => {
          sub.subscription.unsubscribe();
          resolve(null);
        }, 1200);
      });
    }
    if (!session) throw redirect({ to: "/auth" });
    return { user: session.user };
  },
  component: () => (
    <>
      <CloudSync />
      <Outlet />
    </>
  ),
});

function AuthSplash() {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4">
      <div className="size-20 rounded-full overflow-hidden ring-4 ring-primary/20 animate-pulse">
        <img src={logoAsset.url} alt="Eyas Saree Drapist" className="size-full rounded-full object-cover scale-[1.18]" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
        <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
      </div>
    </div>
  );
}
