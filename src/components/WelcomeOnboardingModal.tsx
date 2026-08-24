import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Sparkles,
  PackageCheck,
  PlusCircle,
  Calendar,
  Search,
  Receipt,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Clock,
  Layers,
  Zap,
  Info,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { generateSampleData } from "@/lib/sample-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function WelcomeOnboardingModal() {
  const [open, setOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const settings = useStore((s) => s.settings);

  useEffect(() => {
    // Show if there are 0 bookings and user hasn't dismissed onboarding
    const isDismissed = localStorage.getItem("eyas_onboarding_dismissed");
    if (!isDismissed && bookings.length === 0 && customers.length === 0) {
      const timer = setTimeout(() => {
        setOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [bookings.length, customers.length]);

  const handleLoadDemoData = () => {
    const { customers: sampleCust, bookings: sampleBook, payments: samplePay } = generateSampleData();

    useStore.setState((prev) => ({
      ...prev,
      customers: [...sampleCust],
      bookings: [...sampleBook],
      payments: [...samplePay],
    }));

    localStorage.setItem("eyas_onboarding_dismissed", "true");
    setOpen(false);
    toast.success("Sample Demo Data Loaded! 🎉", {
      description: "4 Sample Bookings added. Try out Calendar dots, Canvas Invoices & Bills.",
      duration: 3500,
    });
  };

  const handleStartFresh = () => {
    localStorage.setItem("eyas_onboarding_dismissed", "true");
    setOpen(false);
    toast.info("Welcome! Start by adding your first Booking or Customer.", {
      duration: 3000,
    });
  };

  const features = [
    {
      id: "calendar",
      title: "Smart Calendar & Saree Dots",
      tamilTitle: "கேலெண்டர் & கலர் புள்ளிகள்",
      icon: Calendar,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
      content: (
        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 space-y-1">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <span>👆 Single Tap any Date:</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              அந்த தேதியைத் தொட்டால், அன்றைய டெலிவரி புக்கிங், வாடிக்கையாளர் பெயர், சேலை எண்ணிக்கை மற்றும் நிலுவைத் தொகை உடனடியாகத் தெரியும்.
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 space-y-1.5">
            <p className="font-bold text-foreground">🎨 Saree Status Color Dots:</p>
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-card border border-border/30">
                <span className="size-2 rounded-full bg-purple-500 shrink-0" />
                <span className="truncate">PrePleat</span>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-card border border-border/30">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Drape</span>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-card border border-border/30">
                <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate">Artist</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "gestures",
      title: "BottomNav Calendar Shortcuts",
      tamilTitle: "கீழ் Calendar பட்டன் ரகசிய குறுக்குவழி",
      icon: Zap,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      content: (
        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
            <p className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <span>⚡ Double-Tap Calendar Tab:</span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500/20">HOT</span>
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              கீழே உள்ள **Calendar ஐகானை இரண்டு முறை தட்டினால் (Double Tap)**, எங்கிருந்தாலும் **Global Search** திறக்கும்! வாடிக்கையாளர் பெயர் அல்லது பில் நம்பரை நொடியில் தேடலாம்.
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 space-y-1">
            <p className="font-bold text-foreground">
              <span>📅 Single-Tap Calendar Tab:</span>
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              கேலெண்டரில் வேறு மாதத்தில் இருந்தாலும், ஒரு முறை தட்டினால் உடனடியாக **இன்றைய தேதிக்கு (Today)** வந்துவிடும்!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "invoices",
      title: "1-Tap Canvas Invoices & Rubber Seals",
      tamilTitle: "மின்னல் வேக PDF பில் & ரப்பர் ஸ்டாம்ப்கள்",
      icon: Receipt,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
      content: (
        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 space-y-1">
            <p className="font-bold text-foreground">
              <span>⚡ 1-Tap Bill # Preview:</span>
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              எந்தவொரு பில் எண்ணைத் (e.g. EYAS-101) தொட்டாலும் 5 மில்லிசெகண்டில் Crystal-Clear PDF Preview தோன்றும்.
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 space-y-1">
            <p className="font-bold text-foreground">
              <span>🏷️ Dynamic Rubber Stamp Seals:</span>
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              முழுவதும் செலுத்திய பில்களுக்கு **PAID & VERIFIED**, முன்பணத்திற்கு **ADVANCE RECEIVED** சீல்கள் பில்லில் தானாக விழும். வாட்ஸ்அப்பில் எண்களைச் சேமிக்காமலே நேரடி பகிர்வு செய்யலாம்!
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border border-border/40 shadow-2xl bg-card max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">
          Welcome to {settings.businessName || "Eyas Saree Drapist"}
        </DialogTitle>
        {/* Header Banner */}
        <div className="saree-gradient p-5 text-white text-center relative overflow-hidden shrink-0">
          <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/10 blur-xl" />
          <div className="absolute -bottom-6 -left-6 size-24 rounded-full bg-white/10 blur-xl" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-md mb-2.5 border border-white/30">
              <Sparkles className="size-6 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-display font-extrabold tracking-tight">
              Welcome to {settings.businessName || "Eyas Saree Drapist"}! 🥻
            </h2>
            <p className="text-xs text-white/90 mt-0.5 max-w-xs font-medium">
              PrePleating, Draping & Instant Billing Manager.
            </p>
          </div>
        </div>

        {/* Interactive Feature Tabs */}
        <div className="flex border-b border-border/30 bg-muted/30 px-3 pt-2 gap-1 overflow-x-auto no-scrollbar shrink-0">
          {features.map((f, idx) => {
            const isActive = activeSlide === idx;
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={cn(
                  "px-3 py-1.5 rounded-t-xl text-[11px] font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border-t border-x",
                  isActive
                    ? "bg-card text-primary border-border/50 -mb-[1px] shadow-2xs"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                <span>{f.title.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Feature Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5 custom-scrollbar">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {features[activeSlide].title}
              </span>
              <span className="text-[10px] text-primary font-semibold">
                · {features[activeSlide].tamilTitle}
              </span>
            </div>
            {features[activeSlide].content}
          </div>

          <div className="pt-2 border-t border-border/30 space-y-2.5">
            <p className="text-[11px] font-bold text-center text-foreground">
              How would you like to start?
            </p>

            {/* Option 1: Load Demo Data */}
            <button
              type="button"
              onClick={handleLoadDemoData}
              className="w-full text-left p-3 rounded-2xl border-2 border-primary/40 bg-primary/[0.04] hover:bg-primary/[0.08] transition-all flex items-start gap-3 cursor-pointer group shadow-2xs hover:shadow-xs active:scale-[0.99]"
            >
              <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs mt-0.5 group-hover:scale-105 transition-transform">
                <PackageCheck className="size-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">
                    Load Sample Demo Data
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-primary/20 text-primary">
                    Recommended
                  </span>
                </div>
                <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">
                  Loads 4 realistic bookings, sarees & payments to test all calendar dots, invoices & WhatsApp bills.
                </p>
              </div>
              <ArrowRight className="size-4 text-primary shrink-0 self-center group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Option 2: Start Fresh */}
            <button
              type="button"
              onClick={handleStartFresh}
              className="w-full text-left p-3 rounded-2xl border border-border/60 bg-secondary/40 hover:bg-secondary/70 transition-all flex items-start gap-3 cursor-pointer group active:scale-[0.99]"
            >
              <div className="size-9 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0 border border-border/40 mt-0.5 group-hover:scale-105 transition-transform">
                <PlusCircle className="size-4.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-foreground">
                  Start Fresh (Clean Slate)
                </span>
                <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">
                  Directly begin entering your real boutique orders from scratch.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border/30 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground px-4 shrink-0">
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3.5 text-success" /> Offline Ready
          </span>
          <span>You can reload demo data anytime in Settings</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
