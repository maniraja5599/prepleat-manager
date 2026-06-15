import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { CloudSync } from "@/components/CloudSync";
import { AppTour } from "@/components/AppTour";
import logoAsset from "@/assets/eyas-logo.png";
import { onAppAuthStateChanged, waitForAppUser, type AppUser } from "@/integrations/firebase/client";

let cachedUser: AppUser | null = null;

if (typeof window !== "undefined") {
  onAppAuthStateChanged((user) => {
    cachedUser = user;
  });
  window.addEventListener("local-auth-change", () => {
    void waitForAppUser(50).then((user) => {
      cachedUser = user;
    });
  });
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingComponent: AuthSplash,
  pendingMs: 600, // Show loading component only if loading takes more than 600ms
  beforeLoad: async () => {
    // If we already have a cached user, return it synchronously (instant transition)
    if (cachedUser) {
      return { user: cachedUser };
    }

    // First try the cached auth state (synchronous from localStorage) — this avoids
    // a network round-trip on first launch that can cause a flash of blank page
    // when the app is opened from the Home-screen bookmark.
    const user = await waitForAppUser();
    if (!user) throw redirect({ to: "/auth" });
    cachedUser = user;
    return { user };
  },
  component: () => (
    <>
      <CloudSync />
      <AppTour />
      <Outlet />
    </>
  ),
});

function AuthSplash() {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4">
      <div className="size-20 rounded-full overflow-hidden ring-4 ring-primary/20 animate-pulse">
        <img
          src={logoAsset}
          alt="Eyas Saree Drapist"
          className="size-full rounded-full object-cover scale-[1.18]"
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span
          className="size-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="size-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: "120ms" }}
        />
        <span
          className="size-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: "240ms" }}
        />
      </div>
    </div>
  );
}
