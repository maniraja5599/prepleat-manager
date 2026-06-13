import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import logoAsset from "../assets/eyas-logo.png.asset.json";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeApplier } from "../components/ThemeApplier";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-bold gold-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-full saree-gradient text-primary-foreground px-5 py-2.5 text-sm font-semibold">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-full saree-gradient text-primary-foreground px-4 py-2 text-sm font-semibold">Try again</button>
          <a href="/" className="rounded-full border border-input bg-background px-4 py-2 text-sm font-medium">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" },
      { name: "theme-color", content: "#1c0030" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Eyas Drapist" },
      { title: "Eyas Saree — PrePleat & Drape" },
      { name: "description", content: "Mobile-first manager for PrePleat & Drape bookings, payments, and customer reminders." },
      { property: "og:title", content: "Eyas Saree — PrePleat & Drape" },
      { name: "twitter:title", content: "Eyas Saree — PrePleat & Drape" },
      { property: "og:description", content: "Mobile-first manager for PrePleat & Drape bookings, payments, and customer reminders." },
      { name: "twitter:description", content: "Mobile-first manager for PrePleat & Drape bookings, payments, and customer reminders." },
      { property: "og:image", content: logoAsset.url },
      { name: "twitter:image", content: logoAsset.url },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/17881f36-1d7f-4820-bbc0-91b4d843e518" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/17881f36-1d7f-4820-bbc0-91b4d843e518" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: logoAsset.url },
      { rel: "apple-touch-icon", href: logoAsset.url },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      <Outlet />
      <Toaster position="top-center" style={{ top: "8%" }} duration={3500} closeButton richColors expand visibleToasts={3} toastOptions={{ style: { background: "var(--color-card)", color: "var(--color-foreground)", border: "1px solid var(--color-border)", borderRadius: "14px", padding: "12px 14px", fontSize: "13px", fontWeight: 500, boxShadow: "0 12px 32px -8px rgba(0,0,0,0.25), 0 4px 12px -2px rgba(0,0,0,0.12)" } }} />
    </QueryClientProvider>
  );
}
