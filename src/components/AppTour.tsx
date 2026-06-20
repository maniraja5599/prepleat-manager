import { useState, useEffect, useMemo } from "react";
import {
  X,
  Sparkles,
  Calendar,
  Settings,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { waitForAppUser, type AppUser } from "@/integrations/firebase/client";

export function AppTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [user, setUser] = useState<AppUser | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("last_known_user");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return null;
  });

  useEffect(() => {
    // Resolve user asynchronously
    waitForAppUser(200).then((u) => {
      if (u) {
        setUser(u);
      }
    });
  }, []);

  const welcomeTitle = useMemo(() => {
    if (!user) return "Welcome to Eyas!";
    if (user.isAnonymous) return "Welcome, Guest User!";
    return `Welcome, ${user.displayName || user.email?.split("@")[0] || "User"}!`;
  }, [user]);

  const welcomeSubtitle = useMemo(() => {
    if (!user) return "App Gestures & Shortcuts Tour";
    if (user.isAnonymous) return "Guest Account · Gestures Tour";
    return `${user.email}`;
  }, [user]);

  useEffect(() => {
    // Check if the user has already completed the tour
    const completed = localStorage.getItem("eyas_tour_completed");
    if (!completed) {
      // Small delay to make it feel premium on first render
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // Listen for custom trigger event to relaunch the tour from Settings
    const handleTrigger = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("trigger-app-tour", handleTrigger);
    return () => window.removeEventListener("trigger-app-tour", handleTrigger);
  }, []);

  if (!open) return null;

  const steps = [
    {
      title: welcomeTitle,
      subtitle: welcomeSubtitle,
      desc: "Let's take a quick 1-minute visual tour of the swipe gestures and touch shortcuts that make managing your saree draping bookings incredibly fast.",
      icon: Sparkles,
      color: "text-primary bg-primary/10",
      illustration: (
        <div className="relative size-28 bg-card rounded-full border border-border flex items-center justify-center shadow-sm">
          <Sparkles className="size-12 text-primary animate-pulse" />
          <span className="absolute top-2 right-2 size-3 bg-gold rounded-full animate-ping" />
        </div>
      ),
    },
    {
      title: "Calendar Swipe",
      subtitle: "Months & Days navigation",
      desc: "Swipe horizontally (← or →) on the Calendar grid to slide between months. You can also swipe left or right on the daily bookings list below to change days instantly.",
      icon: Calendar,
      color: "text-[oklch(0.55_0.13_150)] bg-[oklch(0.55_0.13_150)]/10",
      illustration: (
        <div className="relative size-28 bg-card rounded-3xl border border-border flex flex-col items-center justify-center p-3 shadow-sm overflow-hidden">
          <Calendar className="size-8 text-[oklch(0.55_0.13_150)]" />
          <div className="flex gap-1.5 mt-2">
            <span className="size-1.5 rounded-full bg-border" />
            <span className="size-1.5 rounded-full bg-border" />
            <span className="size-1.5 rounded-full bg-border" />
          </div>
          {/* Swipe Arrow Indicator */}
          <div className="absolute inset-x-2 bottom-4 flex justify-between items-center px-2 pointer-events-none">
            <ChevronLeft className="size-4 text-muted-foreground/50" />
            <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center animate-swipe-h">
              <span className="size-2 rounded-full bg-primary" />
            </div>
            <ChevronRight className="size-4 text-muted-foreground/50" />
          </div>
        </div>
      ),
    },
    {
      title: "Settings Swipe",
      subtitle: "Switch tabs instantly",
      desc: "Inside the Settings page, swipe left or right on the details container to switch smoothly between Pricing, Theme, Headers, and Data tabs without tapping the icons.",
      icon: Settings,
      color: "text-blue-500 bg-blue-500/10",
      illustration: (
        <div className="relative size-28 bg-card rounded-3xl border border-border flex flex-col items-center justify-center p-3 shadow-sm overflow-hidden">
          <Settings className="size-8 text-blue-500 animate-spin-slow" />
          {/* Tab line representation */}
          <div className="w-16 h-1 bg-border rounded-full mt-3 flex justify-start">
            <div className="w-6 h-full bg-blue-500 rounded-full animate-swipe-bar" />
          </div>
          <div className="flex gap-1 bottom-3 absolute">
            <span className="w-3 h-1 rounded bg-blue-500/30" />
            <span className="w-3 h-1 rounded bg-blue-500" />
            <span className="w-3 h-1 rounded bg-blue-500/30" />
          </div>
        </div>
      ),
    },
    {
      title: "Double-Tap Pickers",
      subtitle: "Full calendar & clock modal",
      desc: "When creating a new booking, double tap on any date or time card on the horizontal strip to open the full calendar modal or native clock picker dialog immediately.",
      icon: Clock,
      color: "text-purple-500 bg-purple-500/10",
      illustration: (
        <div className="relative size-28 bg-card rounded-3xl border border-border flex items-center justify-center shadow-sm">
          <Clock className="size-8 text-purple-500" />
          {/* Double Tap Ripple */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="size-12 rounded-full border border-purple-500/60 bg-purple-500/10 animate-double-tap" />
          </div>
        </div>
      ),
    },
    {
      title: "Long-Press Peek",
      subtitle: "Calendar Date hold peek",
      desc: "Press and hold (long-press) any date on the calendar grid to quickly preview that day's bookings in a floating details sheet without leaving the page.",
      icon: Calendar,
      color: "text-amber-500 bg-amber-500/10",
      illustration: (
        <div className="relative size-28 bg-card rounded-3xl border border-border flex flex-col items-center justify-center p-3 shadow-sm overflow-hidden">
          <Calendar className="size-8 text-amber-500" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="size-10 rounded-full border border-dashed border-amber-500/40 bg-amber-500/5 animate-pulse" />
          </div>
        </div>
      ),
    },
    {
      title: "Bottom Nav Shortcut",
      subtitle: "Calendar Double-Click",
      desc: "Double-click or double-tap the Calendar tab icon in the bottom navigation bar to instantly open the global search modal.",
      icon: Calendar,
      color: "text-emerald-500 bg-emerald-500/10",
      illustration: (
        <div className="relative size-28 bg-card rounded-3xl border border-border flex flex-col items-center justify-center p-3 shadow-sm overflow-hidden">
          <Calendar className="size-8 text-emerald-500" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="size-12 rounded-full border border-emerald-500/60 bg-emerald-500/10 animate-double-tap" />
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem("eyas_tour_completed", "true");
      setOpen(false);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("eyas_tour_completed", "true");
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Dynamic backdrop overrides */}
      <style>{`
        @keyframes swipe-arrow-h {
          0%, 100% { transform: translateX(-14px); }
          50% { transform: translateX(14px); }
        }
        @keyframes swipe-bar-h {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(40px); }
        }
        @keyframes ripple-double-tap {
          0% { transform: scale(0.5); opacity: 0; }
          20% { transform: scale(1); opacity: 0.5; }
          40% { transform: scale(0.6); opacity: 0; }
          65% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-swipe-h { animation: swipe-arrow-h 1.8s ease-in-out infinite; }
        .animate-swipe-bar { animation: swipe-bar-h 2.2s ease-in-out infinite; }
        .animate-double-tap { animation: ripple-double-tap 1.6s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
      `}</style>

      <div className="bg-card border border-border w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-250 flex flex-col items-center text-center relative overflow-hidden">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 size-7 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary active:scale-95 transition cursor-pointer"
        >
          <X className="size-4 text-muted-foreground" />
        </button>

        {/* Step indicator */}
        <div className="flex gap-1 mb-4">
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === step ? "w-6 bg-primary" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>

        {/* Animation Illustration Area */}
        <div className="my-3 flex items-center justify-center min-h-[120px]">
          {current.illustration}
        </div>

        {/* Step Header */}
        <div
          className={cn(
            "size-10 rounded-full flex items-center justify-center mb-3.5",
            current.color,
          )}
        >
          <Icon className="size-5" />
        </div>
        <h2 className="text-base font-display font-bold leading-tight">{current.title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
          {current.subtitle}
        </p>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mt-3 min-h-[72px]">
          {current.desc}
        </p>

        {/* Action button container */}
        <div className="flex w-full gap-2.5 mt-5">
          {step > 0 && (
            <button
              onClick={handlePrev}
              className="flex-1 py-2 rounded-xl bg-secondary text-xs font-bold uppercase tracking-wider active:scale-95 transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="size-3.5" /> Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-3 py-2 rounded-xl saree-gradient text-primary-foreground text-xs font-bold uppercase tracking-wider active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-primary/25"
          >
            {step === steps.length - 1 ? (
              <>
                <Check className="size-3.5 stroke-[3]" /> Done
              </>
            ) : (
              <>
                Next <ChevronRight className="size-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
