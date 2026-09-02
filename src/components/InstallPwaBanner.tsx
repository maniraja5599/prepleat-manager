import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Download, X, Share2, PlusSquare, Sparkles, Smartphone, Check, Loader2, MoreVertical } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPwaBanner() {
  const settings = useStore((s) => s.settings);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [showAndroidHelp, setShowAndroidHelp] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already installed / running in standalone mode or native Capacitor
    const checkStandalone = () => {
      const isDisplayStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isNavStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
      const isCapacitor = Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
      return isDisplayStandalone || isNavStandalone || isCapacitor;
    };

    if (checkStandalone()) {
      setIsStandalone(true);
      return;
    }

    setIsStandalone(false);

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isAppleDevice = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isAppleDevice);

    // Check dismissal persistence
    const isDismissed = localStorage.getItem("eyas_install_banner_dismissed") === "true";
    setDismissed(isDismissed);

    // Listen for Android/Desktop Chrome beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        setIsInstalling(true);
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          localStorage.setItem("eyas_install_banner_dismissed", "true");
          setDismissed(true);
        }
      } catch {
        // user cancelled or prompt failed
      } finally {
        setIsInstalling(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSHelp((prev) => !prev);
    } else {
      // Android/Desktop fallback if prompt not fired yet
      setShowAndroidHelp((prev) => !prev);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem("eyas_install_banner_dismissed", "true");
    setDismissed(true);
  };

  if (isStandalone || dismissed) return null;

  return (
    <div className="relative mx-auto max-w-md px-3 pt-2.5 z-40">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 via-primary/10 to-amber-500/15 border border-primary/25 p-3 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl saree-gradient flex items-center justify-center text-white shrink-0 shadow-sm">
              <Smartphone className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-foreground truncate">
                  {settings.businessName || "Saree PrePleat Studio"}
                </p>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-primary/20 text-primary shrink-0">
                  {isIOS ? "iOS" : "WEB APP"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {isIOS
                  ? "Add to Home Screen for best experience"
                  : "Install on phone in 1-Click"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="px-3 py-1.5 rounded-xl saree-gradient text-white text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-75"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Installing...</span>
                </>
              ) : isIOS ? (
                <>
                  <Share2 className="size-3.5" />
                  <span>Install Guide</span>
                </>
              ) : (
                <>
                  <Download className="size-3.5 stroke-[2.5]" />
                  <span>Install ⚡</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              title="Close"
              className="size-6 rounded-full hover:bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground text-xs transition cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* iOS Step-by-Step Tooltip Guide */}
        {isIOS && showIOSHelp && (
          <div className="mt-3 pt-3 border-t border-border/40 text-xs space-y-2 animate-in fade-in zoom-in-95">
            <p className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
              <Sparkles className="size-3.5 text-primary" />
              <span>Install on iPhone / iPad in 2 easy steps:</span>
            </p>
            <div className="grid grid-cols-1 gap-1.5 bg-background/80 dark:bg-background/60 p-2.5 rounded-xl border border-border/30 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <span className="text-foreground">
                  Tap the Safari <b>Share <Share2 className="size-3 inline mx-0.5" /></b> button at the bottom.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <span className="text-foreground">
                  Scroll down and select <b>"Add to Home Screen" <PlusSquare className="size-3 inline mx-0.5" /></b>.
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowIOSHelp(false)}
                className="text-[10px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                <Check className="size-3" />
                <span>Got it</span>
              </button>
            </div>
          </div>
        )}

        {/* Android / Chrome Manual Fallback Guide */}
        {!isIOS && showAndroidHelp && (
          <div className="mt-3 pt-3 border-t border-border/40 text-xs space-y-2 animate-in fade-in zoom-in-95">
            <p className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
              <Sparkles className="size-3.5 text-primary" />
              <span>Install via Chrome Menu:</span>
            </p>
            <div className="bg-background/80 dark:bg-background/60 p-2.5 rounded-xl border border-border/30 text-[11px] space-y-1.5">
              <p className="text-foreground">
                1. Tap the Chrome menu button <MoreVertical className="size-3 inline mx-0.5 text-foreground" /> in the top-right corner.
              </p>
              <p className="text-foreground">
                2. Tap <b>"Install app"</b> or <b>"Add to Home screen"</b>.
              </p>
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowAndroidHelp(false)}
                className="text-[10px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                <Check className="size-3" />
                <span>Got it</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
