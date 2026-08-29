import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, Gift, Share2, MessageCircle, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { onAppAuthStateChanged, type AppUser } from "@/integrations/firebase/client";
import { subscribeToUserProfile, checkSubscriptionStatus, type UserProfile } from "@/lib/subscription";

export function SubscriptionWelcomeModal() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (open) {
      const prevOverflow = document.body.style.overflow;
      const prevTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
      };
    }
  }, [open]);

  useEffect(() => {
    const unsub = onAppAuthStateChanged((u) => {
      setUser(u);
      if (u && !u.isAnonymous) {
        const seen = localStorage.getItem("has_seen_trial_welcome_v2");
        if (!seen) {
          // Check if trial or active
          setOpen(true);
        }
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const unsub = subscribeToUserProfile(user.id, (p) => {
      if (p) setProfile(p);
    });
    return () => unsub();
  }, [user]);

  if (!open || !user || user.isAnonymous) return null;

  const status = checkSubscriptionStatus(user, profile);

  const handleDismiss = () => {
    localStorage.setItem("has_seen_trial_welcome_v2", "true");
    setOpen(false);
  };

  const handleShareWhatsApp = () => {
    const code = status.referralCode;
    const msg = encodeURIComponent(
      `🥻 Manage Saree PrePleat & Draping orders with ease!\n\n⚡ Fast Booking, WhatsApp Bills, Offline Cloud Sync & Payment Tracking.\n\n🎁 Get 30 Days 100% Free Trial using my referral code: *${code}*\n\n👉 Open App: https://eyas.app`,
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
    handleDismiss();
  };

  return (
    <div
      className="fixed inset-0 z-[28000] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 text-left overscroll-contain animate-in fade-in duration-200" style={{ touchAction: "none" }}
      onClick={handleDismiss}
    >
      <div
        className="bg-card w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-primary/40 space-y-4 animate-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Badge */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full saree-gradient text-white text-xs font-black uppercase tracking-wider shadow-xs">
            <Sparkles className="size-3.5" />
            <span>30-Day Free Trial Activated 🎉</span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">
            {status.expiryDateStr}
          </span>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-bold font-display text-foreground">
            Welcome to Saree PrePleat Manager!
          </h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Your full-featured account is now active with 30 days of 100% free access.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="bg-secondary/40 rounded-2xl p-3.5 border border-border/40 space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground font-semibold">
              Unlimited Saree Bookings & Draping Jobs
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground font-semibold">
              Automatic WhatsApp PDF Invoices & Job Updates
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground font-semibold">
              Payments, Dues, Extra Income & Expense Tracking
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground font-semibold">
              Seamless Cloud & Offline Sync Across All Devices
            </span>
          </div>
        </div>

        {/* 🎁 Referral Bonus Box */}
        <div className="bg-primary/10 rounded-2xl p-3 border border-primary/30 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-primary">
            <Gift className="size-4 text-primary" />
            <span>Refer & Earn 1 Free Month! 🎁</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Invite fellow drapists or boutique owners. When your friend subscribes, you get{" "}
            <span className="font-bold text-foreground">+30 Days Free (1 Free Month)</span> added
            instantly!
          </p>
          <div className="flex items-center justify-between bg-card rounded-xl px-3 py-1.5 border border-border mt-1">
            <span className="text-[10px] text-muted-foreground font-bold">Your Referral Code:</span>
            <span className="font-mono font-black text-xs text-primary">{status.referralCode}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleDismiss}
            className="w-full py-3 rounded-2xl saree-gradient text-white text-xs font-bold shadow-md hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
          >
            <span>Start Exploring Now</span>
            <ArrowRight className="size-3.5" />
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <MessageCircle className="size-4" />
            <span>Invite Friends on WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
