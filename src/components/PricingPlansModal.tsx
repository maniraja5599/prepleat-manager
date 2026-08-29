import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  X,
  Sparkles,
  Check,
  Tag,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  Clock,
  Zap,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createCashfreeOrderServer } from "@/lib/cashfreeServer";
import { useStore } from "@/lib/store";
import {
  redeemCoupon,
  updateUserPhone,
  updateUserPlan,
  createCashfreeOrderSession,
  checkSubscriptionStatus,
  type SystemSubscriptionConfig,
  type UserProfile,
  DEFAULT_CONFIG,
} from "@/lib/subscription";
import { type AppUser } from "@/integrations/firebase/client";

declare global {
  interface Window {
    Cashfree?: any;
  }
}

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
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Lock body scroll and background touches when modal is active
  useEffect(() => {
    if (open) {
      const savedPhone =
        userProfile?.phone ||
        localStorage.getItem("user_last_payment_phone") ||
        useStore.getState().settings.businessPhone ||
        "";
      if (savedPhone) {
        setPhoneNumber(savedPhone.replace(/\D/g, "").slice(-10));
      }
      const prevOverflow = document.body.style.overflow;
      const prevTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
      };
    }
  }, [open, userProfile]);

  if (!open) return null;

  const currentStatus = checkSubscriptionStatus(user, userProfile);
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
    const phone = config.supportWhatsapp || "919159036301";
    const planName = selectedPlan === "yearly" ? `Yearly Plan (₹${yearlyPrice})` : `Monthly Plan (₹${monthlyPrice})`;
    const userEmail = user?.email || "My Account";
    const msg = encodeURIComponent(
      `Hi Maniraja! I would like to subscribe to Saree PrePleat Manager.\n\n📧 Email: ${userEmail}\n💎 Selected Plan: ${planName}\n\nPlease share the UPI QR code / payment details to activate my account!`,
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const handleCashfreePayment = async () => {
    if (!user) {
      toast.error("Please sign in first.");
      return;
    }

    const appId = config.cashfreeAppId?.trim() || "";
    const secretKey = config.cashfreeSecretKey?.trim() || "";

    const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number for Cashfree & invoice receipts.");
      return;
    }

    // Persist phone for next time
    try {
      localStorage.setItem("user_last_payment_phone", cleanPhone);
      if (user.id) {
        updateUserPhone(user.id, cleanPhone);
      }
      useStore.getState().updateSettings({ businessPhone: cleanPhone });
    } catch (_) {}

    setIsProcessingPayment(true);
    const amount = selectedPlan === "yearly" ? yearlyPrice : monthlyPrice;
    const planDays = selectedPlan === "yearly" ? 365 : 30;
    const planTitle = selectedPlan === "yearly" ? "Yearly Plan (365 Days)" : "Monthly Plan (30 Days)";
    const isProd = config.cashfreeEnv === "PROD";

    try {
      toast.info("Initializing Cashfree Drop-in Checkout...", { duration: 3000 });

      // 1. Call server-side function to create order session without CORS block
      const orderRes = await createCashfreeOrderServer({
        data: {
          appId,
          secretKey,
          isProd,
          amount,
          plan: selectedPlan,
          userId: user.id,
          userEmail: user.email || "user@sareeprepleat.com",
          customerPhone: cleanPhone,
        },
      });

      if (!orderRes || !orderRes.success || !orderRes.paymentSessionId) {
        toast.error(orderRes?.message || "Could not open Cashfree payment. Switching to WhatsApp UPI.");
        handleWhatsAppPayment();
        setIsProcessingPayment(false);
        return;
      }

      // 2. Load Cashfree JS SDK if not already in document
      if (!window.Cashfree) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Cashfree checkout SDK"));
          document.body.appendChild(script);
        });
      }

      const cashfreeInstance = window.Cashfree({
        mode: isProd ? "production" : "sandbox",
      });

      // 3. Open Cashfree Drop-in Checkout Popup
      cashfreeInstance.checkout({
        paymentSessionId: orderRes.paymentSessionId,
        redirectTarget: "_modal",
      }).then(async (result: any) => {
        setIsProcessingPayment(false);
        if (result.error) {
          console.warn("Cashfree checkout error:", result.error);
          toast.info("Payment session was closed or cancelled.");
        } else if (result.paymentDetails) {
          // Payment Successful! Stack/Queue days to existing plan
          try {
            await updateUserPlan(
              user.id,
              selectedPlan,
              planDays,
              undefined,
              true,
              `Paid ₹${amount} via Cashfree (${orderRes.orderId})`,
            );
            toast.success(`🎉 Payment Successful! Your ${planTitle} has been stacked to your account!`, { duration: 5000 });
            onClose();
          } catch (err: any) {
            toast.error(err?.message || "Payment received! Plan updated.");
          }
        }
      });
    } catch (err: any) {
      console.error("Payment error:", err);
      setIsProcessingPayment(false);
      toast.error(err?.message || "Failed to initialize Cashfree. Opening WhatsApp UPI...");
      handleWhatsAppPayment();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[26000] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 text-left overscroll-contain animate-in fade-in duration-200"
      onClick={!isExpired ? onClose : undefined}
      style={{ touchAction: "none" }}
    >
      <div
        className="bg-card w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-border/60 max-h-[90vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-200 text-left select-text"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "auto" }}
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

        {/* Current Active Plan Status & Queueing Banner */}
        {userProfile && (
          <div className="bg-secondary/50 rounded-2xl p-3 border border-border/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Layers className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  Current: <span className="text-primary">{currentStatus.planName}</span> ({currentStatus.daysRemaining} days left)
                </p>
                <p className="text-[10px] text-muted-foreground">
                  New plans are <strong className="text-foreground">queued & stacked</strong> onto your current expiry ({currentStatus.expiryDateStr}).
                </p>
              </div>
            </div>
          </div>
        )}

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
                Just ₹{Math.round(yearlyPrice / 12)}/month · +365 Days Stacked
              </p>
            </div>

            <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground border-t border-border/40 pt-2.5">
              <li className="flex items-center gap-1.5 text-foreground font-semibold">
                <Check className="size-3 text-primary" /> Full 365 Days Extended
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary" /> Unlimited Bookings & Invoices
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary" /> Priority WhatsApp Support
              </li>
            </ul>
          </div>

          {/* Monthly Plan */}
          <div
            onClick={() => setSelectedPlan("monthly")}
            className={cn(
              "p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between",
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

              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-display text-foreground">
                  ₹{monthlyPrice}
                </span>
                <span className="text-[10px] text-muted-foreground">/ month</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Billed monthly · +30 Days Stacked
              </p>
            </div>

            <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground border-t border-border/40 pt-2.5">
              <li className="flex items-center gap-1.5 font-semibold text-foreground">
                <Check className="size-3 text-primary" /> Full 30 Days Extended
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary" /> Unlimited Bookings
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-primary" /> WhatsApp Bills & Cloud Sync
              </li>
            </ul>
          </div>
        </div>

        {/* Promo Coupon Box */}
        <form
          onSubmit={handleApplyCoupon}
          className="bg-secondary/40 rounded-2xl p-3 border border-border/40 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Tag className="size-3.5 text-primary" />
              <span>Have a Promo Coupon Code?</span>
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter Code (e.g. LAUNCH100)"
              className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs uppercase font-mono font-bold tracking-wider focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isApplyingCoupon || !couponCode.trim()}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
            >
              {isApplyingCoupon ? "Checking..." : "Apply"}
            </button>
          </div>
        </form>

        {/* Mobile Number Input for Cashfree & WhatsApp Receipts */}
        <div className="bg-secondary/30 rounded-2xl p-3 border border-border/40 space-y-1.5">
          <label className="text-[11px] font-bold text-foreground block">
            Mobile Number (Required for Online Payment & SMS Receipt)
          </label>
          <div className="flex items-center gap-2">
            <span className="bg-card px-2.5 py-2 rounded-xl text-xs font-bold text-muted-foreground border border-border">
              +91
            </span>
            <input
              type="tel"
              maxLength={10}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 10-digit mobile number"
              className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Action Buttons: Clean & Compact (Zero Overflow) */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleCashfreePayment}
            disabled={isProcessingPayment}
            className="w-full py-3 px-3 rounded-2xl saree-gradient text-white text-xs font-bold shadow-md hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider disabled:opacity-50"
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="size-4 animate-spin shrink-0" />
                <span>Opening Cashfree Checkout...</span>
              </>
            ) : (
              <>
                <CreditCard className="size-4 shrink-0" />
                <span>Pay ₹{selectedPlan === "yearly" ? yearlyPrice : monthlyPrice} Online (Cashfree)</span>
              </>
            )}
          </button>

          <button
            onClick={handleWhatsAppPayment}
            className="w-full py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="size-4 shrink-0" />
            <span>Pay via UPI / WhatsApp (GPay / PhonePe)</span>
          </button>
        </div>

        {/* Guarantee Badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
          <ShieldCheck className="size-3.5 text-primary" />
          <span>100% Secure · Instant Queueing & Stacked Activation</span>
        </div>
      </div>
    </div>
  );
}
