import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sparkles, PackageCheck, PlusCircle, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { generateSampleData } from "@/lib/sample-data";
import { toast } from "sonner";

export function WelcomeOnboardingModal() {
  const [open, setOpen] = useState(false);
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const settings = useStore((s) => s.settings);

  useEffect(() => {
    // Show only if there are 0 bookings and user hasn't completed or dismissed onboarding
    const isDismissed = localStorage.getItem("eyas_onboarding_dismissed");
    if (!isDismissed && bookings.length === 0 && customers.length === 0) {
      const timer = setTimeout(() => {
        setOpen(true);
      }, 600);
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
      description: "Explore Bookings, Bills, Canvas PDF Invoices & Timeline.",
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border border-border/40 shadow-2xl bg-card">
        {/* Header Banner */}
        <div className="saree-gradient p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/10 blur-xl" />
          <div className="absolute -bottom-6 -left-6 size-24 rounded-full bg-white/10 blur-xl" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-md mb-3 border border-white/30">
              <Sparkles className="size-7 text-white" />
            </div>
            <h2 className="text-xl font-display font-extrabold tracking-tight">
              Welcome to {settings.businessName || "Eyas Saree Drapist"}! 🥻
            </h2>
            <p className="text-xs text-white/85 mt-1 max-w-xs font-medium">
              Your complete PrePleating, Draping & Instant Billing Manager.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3.5">
          <p className="text-xs text-muted-foreground text-center font-medium">
            How would you like to get started today?
          </p>

          {/* Option 1: Load Demo Data */}
          <button
            type="button"
            onClick={handleLoadDemoData}
            className="w-full text-left p-3.5 rounded-2xl border-2 border-primary/40 bg-primary/[0.04] hover:bg-primary/[0.08] transition-all flex items-start gap-3 cursor-pointer group shadow-2xs hover:shadow-xs active:scale-[0.99]"
          >
            <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs mt-0.5 group-hover:scale-105 transition-transform">
              <PackageCheck className="size-5" />
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
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Includes sample bookings, sarees & payments to try out PDF bills, rubber stamps, and timelines right away.
              </p>
            </div>
            <ArrowRight className="size-4 text-primary shrink-0 self-center group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Option 2: Start Fresh */}
          <button
            type="button"
            onClick={handleStartFresh}
            className="w-full text-left p-3.5 rounded-2xl border border-border/60 bg-secondary/40 hover:bg-secondary/70 transition-all flex items-start gap-3 cursor-pointer group active:scale-[0.99]"
          >
            <div className="size-10 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0 border border-border/40 mt-0.5 group-hover:scale-105 transition-transform">
              <PlusCircle className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-foreground">
                Start Fresh (Clean Slate)
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Start with a clean app to enter your own real business bookings from scratch.
              </p>
            </div>
          </button>

          <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-success" /> Offline & Cloud synced
            </span>
            <span>You can reset anytime in Settings</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
