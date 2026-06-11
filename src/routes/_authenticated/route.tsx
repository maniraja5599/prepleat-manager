import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CloudSync } from "@/components/CloudSync";
import logoAsset from "@/assets/eyas-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingComponent: AuthSplash,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
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
      <img src={logoAsset.url} alt="Eyas Saree Drapist" className="size-20 rounded-full ring-4 ring-primary/20 animate-pulse" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
        <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
      </div>
    </div>
  );
}
