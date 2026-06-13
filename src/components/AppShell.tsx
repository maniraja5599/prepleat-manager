import { useState, useEffect, type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { useStore } from "@/lib/store";
import logoAsset from "@/assets/eyas-logo.png";
import { CloudOff, RefreshCw, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  /** @deprecated brand strip now renders on every page automatically */
  showBrand?: boolean;
  wide?: boolean;
}

export function AppShell({ title, subtitle, right, children, wide }: Props) {
  const settings = useStore((s) => s.settings);
  const logo = settings.logoDataUrl || logoAsset;

  const [sync, setSync] = useState(() => {
    if (typeof window !== "undefined" && (window as any).__syncStatus) {
      return (window as any).__syncStatus;
    }
    return { syncStatus: "synced", showStatus: false };
  });

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setSync(customEvent.detail);
      }
    };
    window.addEventListener("sync-status-update", handleUpdate);
    return () => window.removeEventListener("sync-status-update", handleUpdate);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background pb-28">
      <div className={wide ? "max-w-3xl mx-auto" : "max-w-md mx-auto"}>
        {/* Uniform brand strip — every page */}
        <div className="safe-header-top px-5 pb-1 flex items-center gap-2.5">
          <img
            src={logo}
            alt={settings.businessName}
            className="size-8 rounded-full object-cover scale-[1.18] ring-1 ring-primary/25"
          />
          <p className="text-[13px] font-display font-semibold tracking-tight truncate">{settings.businessName}</p>
          
          <div className="ml-auto flex items-center gap-1.5">
            {sync.showStatus ? (
              <div
                className={cn(
                  "px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all duration-300 animate-in fade-in slide-in-from-right-2",
                  sync.syncStatus === "syncing" && "bg-blue-500/10 border-blue-500/30 text-blue-500",
                  sync.syncStatus === "offline" && "bg-amber-500/10 border-amber-500/30 text-amber-500",
                  sync.syncStatus === "error" && "bg-red-500/15 border-red-500/35 text-red-500 animate-shake-sm",
                  sync.syncStatus === "synced" && "bg-[oklch(0.55_0.13_150)]/10 border-[oklch(0.55_0.13_150)]/30 text-[oklch(0.55_0.13_150)]"
                )}
              >
                {sync.syncStatus === "syncing" && (
                  <>
                    <RefreshCw className="size-2.5 animate-spin" />
                    <span>Syncing</span>
                  </>
                )}
                {sync.syncStatus === "offline" && (
                  <>
                    <CloudOff className="size-2.5 animate-bounce-slow" />
                    <span>Offline</span>
                  </>
                )}
                {sync.syncStatus === "error" && (
                  <>
                    <AlertCircle className="size-2.5 animate-pulse" />
                    <span>Error</span>
                  </>
                )}
                {sync.syncStatus === "synced" && (
                  <>
                    <Check className="size-2.5" />
                    <span>Synced</span>
                  </>
                )}
              </div>
            ) : (
              <span className="size-1.5 rounded-full bg-gold/60 animate-in fade-in duration-300" aria-hidden />
            )}
            <style>{`
              @keyframes shake-sm {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-2px); }
                75% { transform: translateX(2px); }
              }
              .animate-shake-sm {
                animation: shake-sm 0.3s ease-in-out;
              }
              @keyframes bounce-slow {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-2px); }
              }
              .animate-bounce-slow {
                animation: bounce-slow 2s infinite ease-in-out;
              }
            `}</style>
          </div>
        </div>

        {title && (
          <header className="px-5 pt-2 pb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-display font-semibold tracking-tight truncate">{title}</h1>
              {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
            </div>
            {right}
          </header>
        )}
        <main className="px-5">{children}</main>
        <p className="text-center text-[10px] text-muted-foreground/70 mt-8 pb-2">
          Developed by{" "}
          <a href="https://www.instagram.com/maniraja__/" target="_blank" rel="noreferrer" className="font-semibold text-primary/80 hover:underline">ManiRaja</a>
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
