import { useState, useEffect } from "react";
import { Download, X, Share2, PlusSquare, Sparkles, Smartphone, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
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
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          localStorage.setItem("eyas_install_banner_dismissed", "true");
          setDismissed(true);
        }
      } catch {
        // user cancelled or prompt failed
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSHelp((prev) => !prev);
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
                  Eyas Drapist App
                </p>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-primary/20 text-primary shrink-0">
                  {isIOS ? "iOS" : "WEB APP"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {isIOS
                  ? "ஹோம் ஸ்கிரீனில் சேர்க்கவும் (Add to Home)"
                  : "மொபைலில் 1-கிளிக்கில் Install செய்யவும்"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl saree-gradient text-white text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
            >
              {isIOS ? (
                <>
                  <Share2 className="size-3.5" />
                  <span>Install வழிகாட்டி</span>
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
              <span>iPhone / iPad-ல் App ஆக பயன்படுத்த எளிய 2 படிகள்:</span>
            </p>
            <div className="grid grid-cols-1 gap-1.5 bg-background/80 dark:bg-background/60 p-2.5 rounded-xl border border-border/30 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <span className="text-foreground">
                  கீழே உள்ள Safari <b>Share <Share2 className="size-3 inline mx-0.5" /></b> ஐகானைத் தொடவும்.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <span className="text-foreground">
                  கீழே உருட்டி <b>"Add to Home Screen" <PlusSquare className="size-3 inline mx-0.5" /></b> என்பதைத் தொடவும்.
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
                <span>புரிந்தது (Done)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
