import { useState } from "react";
import { toast } from "sonner";
import {
  X,
  Sparkles,
  Check,
  Tag,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  redeemCoupon,
  type SystemSubscriptionConfig,
  type UserProfile,
  DEFAULT_CONFIG,
} from "@/lib/subscription";
import { type AppUser } from "@/integrations/firebase/client";

export function PricingPlansModal({
  user,
  userProfile,
  config = DEFAULT_CONFIG,
  open,
  onClose,
  isExpired = false,
}: {
  user: AppUser | null;
  userProfile: UserProfile | null;
  config?: SystemSubscriptionConfig;
  open: boolean;
  onClose: () => void;
  isExpired?: boolean;
}) {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  if (!open) return null;

  const monthlyPrice = config.monthlyPrice || 299;
  const yearlyPrice = config.yearlyPrice || 1999;
  const yearlyOriginalPrice = config.yearlyOriginalPrice || 3588;
  const discountPercent = Math.round(
    ((yearlyOriginalPrice - yearlyPrice) / yearlyOriginalPrice) * 100,
  );

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to redeem coupons.");
      return;
    }
    if (!couponCode.trim()) {
      toast.error("Enter a valid coupon code");
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const result = await redeemCoupon(couponCode, user);
      if (result.success) {
        toast.success(result.message, { duration: 4000 });
        setCouponCode("");
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleWhatsAppPayment = () => {
    const phone = config.supportWhatsapp || "919000000000";
    const planName = selectedPlan === "yearly" ? "Yearly Plan (₹1,999)" : "Monthly Plan (₹299)";
    const userEmail = user?.email || "My Account";
    const msg = encodeURIComponent(
      `Hi Maniraja! I would like to subscribe to Saree PrePleat Manager.\n\n📧 Email: ${userEmail}\n💎 Selected Plan: ${planName}\n\nPlease share the UPI payment details to activate my account!`,
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const handleCashfreePayment = () => {
    // Direct link or cashfree checkout
    toast.info("Connecting to Cashfree Secure Checkout...", { duration: 2500 });
    // In test/demo or direct link, open WhatsApp/UPI fallback
    setTimeout(() => {
      handleWhatsAppPayment();
    }, 800);
  };

  return (
    <div
      className="fixed inset-0 z-[26000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 text-left animate-in fade-in duration-200"
      onClick={!isExpired ? onClose : undefined}
    >
      <div
        className="bg-card w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-border/60 max-h-[90vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold">
              <Sparkles className="size-3" />
              <span>{isExpired ? "Account Expired" : "Unlock Full Access"}</span>
            </div>
            <h2 className="text-xl font-bold font-display text-foreground">
              {isExpired ? "Renew Your Subscription" : "Choose Your Plan"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Unlimited saree bookings, WhatsApp automation, payment tracking & cloud sync.
            </p>
          </div>
          {!isExpired && (
            <button
              onClick={onClose}
              className="size-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition cursor-pointer shrink-0"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Plan Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Yearly Plan (Highlight Deal) */}
          <div
            onClick={() => setSelectedPlan("yearly")}
            className={cn(
              "relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between",
              selectedPlan === "yearly"
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border/60 bg-secondary/30 hover:border-border",
            )}
          >
            <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full saree-gradient text-white text-[9.5px] font-black uppercase tracking-wider shadow-xs">
              Save {discountPercent}% ✨
            </span>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Yearly Plan
                </span>
                <div
                  className={cn(
                    "size-4 rounded-full border flex items-center justify-center",
                    selectedPlan === "yearly"
                      ? "border-primary bg-primary text-white"
                      : "border-muted-foreground",
                  )}
                >
                  {selectedPlan === "yearly" && <Check className="size-2.5 stroke-[3]" />}
                </div>
              </div>

              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-display text-foreground">
                  ₹{yearlyPrice}
                </span>
                <span className="text-xs text-muted-foreground line-through">
                  ₹{yearlyOriginalPrice}
                </span>
                <span className="text-[10px] text-muted-foreground">/ year</span>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                Just ₹{Math.round(yearlyPrice / 12)}/month · Best for Professionals
              </p>
            </div>

            <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground border-t border-border/40 pt-2.5">
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" /> Full 365 Days Access
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" /> Priority Cloud & Offline Sync
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" /> Free Future Updates
              </li>
            </ul>
          </div>

          {/* Monthly Plan */}
          <div
            onClick={() => setSelectedPlan("monthly")}
            className={cn(
              "relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between",
              selectedPlan === "monthly"
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border/60 bg-secondary/30 hover:border-border",
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Monthly Plan
                </span>
                <div
                  className={cn(
                    "size-4 rounded-full border flex items-center justify-center",
                    selectedPlan === "monthly"
                      ? "border-primary bg-primary text-white"
                      : "border-muted-foreground",
                  )}
                >
                  {selectedPlan === "monthly" && <Check className="size-2.5 stroke-[3]" />}
                </div>
              </div>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black font-display text-foreground">
                  ₹{monthlyPrice}
                </span>
                <span className="text-[10px] text-muted-foreground">/ month</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Billed monthly · Cancel anytime
              </p>
            </div>

            <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground border-t border-border/40 pt-2.5">
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" /> 30 Days Full Access
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary shrink-0" /> Unlimited Bookings & Jobs
              </li>
            </ul>
          </div>
        </div>

        {/* Promo / Discount Coupon Box */}
        <form
          onSubmit={handleApplyCoupon}
          className="bg-secondary/50 rounded-2xl p-3 border border-border/40 space-y-1.5"
        >
          <label className="text-[10.5px] font-bold text-foreground flex items-center gap-1">
            <Tag className="size-3 text-primary" />
            <span>Have a Discount Offer or Promo Coupon?</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="e.g. LAUNCH100, PREPLEAT50"
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs uppercase font-bold tracking-wider focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isApplyingCoupon || !couponCode.trim()}
              className="px-4 py-2 rounded-xl saree-gradient text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 disabled:opacity-50 transition cursor-pointer shrink-0"
            >
              {isApplyingCoupon ? "Checking..." : "Apply Code"}
            </button>
          </div>
        </form>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleCashfreePayment}
            className="w-full py-3 rounded-2xl saree-gradient text-white font-bold text-sm shadow-md hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="size-4" />
            <span>
              Pay ₹{selectedPlan === "yearly" ? yearlyPrice : monthlyPrice} (Cashfree / UPI)
            </span>
          </button>

          <button
            type="button"
            onClick={handleWhatsAppPayment}
            className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <MessageCircle className="size-4" />
            <span>Pay via WhatsApp / GPay & Instant Activation</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-1 border-t border-border/20">
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3.5 text-primary" /> 100% Secure Activation
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Zap className="size-3.5 text-amber-500" /> Instant Access
          </span>
        </div>
      </div>
    </div>
  );
}
