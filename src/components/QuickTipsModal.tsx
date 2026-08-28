import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Lightbulb,
  Zap,
  Receipt,
  MessageCircle,
  IndianRupee,
  Sparkles,
  Smartphone,
  Calendar,
  Search,
  CheckCircle2,
  Share2,
  Clock,
  Layers,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TipCategory {
  id: string;
  label: string;
  icon: typeof Zap;
  color: string;
  tips: {
    title: string;
    desc: string;
    badge?: string;
    icon: typeof Zap;
  }[];
}

const TIP_CATEGORIES: TipCategory[] = [
  {
    id: "gestures",
    label: "⚡ Gestures & Speed",
    icon: Zap,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    tips: [
      {
        title: "1-Tap Instant Bill # Preview",
        desc: "Tap any Bill # (e.g. EYAS-101) to open the zero-lag Canvas invoice preview with 1-click WhatsApp and PDF download.",
        badge: "HOT ✨",
        icon: Receipt,
      },
      {
        title: "Sticky Search & Live Tickers",
        desc: "When scrolling down, the search bar and the current Month Header stay pinned at the top so you never lose context.",
        badge: "NEW 📌",
        icon: Search,
      },
      {
        title: "Last 4-Digit Quick Phone Search",
        desc: "Just type the last 4 digits of a customer's phone number into the search bar to instantly find their booking.",
        icon: Smartphone,
      },
      {
        title: "Tap Top Header Clock for Calendar",
        desc: "Tap the live date next to the shop title to jump quickly to the date-picker or calendar view.",
        icon: Clock,
      },
    ],
  },
  {
    id: "invoices",
    label: "🧾 Invoices & Rubber Seals",
    icon: Receipt,
    color: "text-primary bg-primary/10 border-primary/30",
    tips: [
      {
        title: "Native Canvas High-Speed Invoices",
        desc: "Invoices render in <5ms on a native HTML5 2D Canvas with crystal clarity, ready for A5 print or WhatsApp image.",
        badge: "0-LAG ⚡",
        icon: Receipt,
      },
      {
        title: "Smart Rubber Stamp Seals",
        desc: "Paid bills get 'PAID & VERIFIED', advances get 'ADVANCE RECEIVED', and unpaid get 'PAYMENT PENDING' seals automatically.",
        icon: CheckCircle2,
      },
      {
        title: "No-Save Direct WhatsApp Share",
        desc: "Share booking details and PDF bills to WhatsApp directly without needing to save the customer's phone number in your contacts.",
        badge: "DIRECT 💬",
        icon: MessageCircle,
      },
    ],
  },
  {
    id: "payments",
    label: "💰 Payments & Accounts",
    icon: IndianRupee,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    tips: [
      {
        title: "Automated Advance & Balance Due",
        desc: "Entering an advance automatically computes remaining balance due and adds a payment entry to the customer's ledger.",
        icon: IndianRupee,
      },
      {
        title: "Instant UPI QR Code on Bill",
        desc: "Save your UPI ID in Settings to print a dynamic UPI QR code on invoices so customers can scan and pay instantly.",
        badge: "GPay / PhonePe",
        icon: Sparkles,
      },
      {
        title: "One-Tap Payment Settlement",
        desc: "When marking a booking completed/delivered, the app prompts you to collect remaining balance in 1 tap.",
        icon: CheckCircle2,
      },
    ],
  },
  {
    id: "shortcuts",
    label: "⌨️ Desktop Keys",
    icon: Layers,
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/30",
    tips: [
      {
        title: "Press '/' to Search",
        desc: "Focuses the search bar from anywhere on desktop keyboard.",
        badge: "Key: /",
        icon: Search,
      },
      {
        title: "Press 'Esc' to Close",
        desc: "Quickly closes modals, preview dialogs, and slide-in drawers.",
        badge: "Key: Esc",
        icon: Zap,
      },
      {
        title: "Press 'Alt + N' for New Booking",
        desc: "Opens the booking creator form immediately.",
        badge: "Key: Alt + N",
        icon: Calendar,
      },
    ],
  },
];

interface QuickTipsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickTipsModal({ open, onOpenChange }: QuickTipsModalProps) {
  const [activeTab, setActiveTab] = useState("gestures");

  const currentCategory = TIP_CATEGORIES.find((c) => c.id === activeTab) || TIP_CATEGORIES[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl border border-border/40 shadow-2xl bg-card max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/30 bg-muted/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs border border-primary/20">
              <Lightbulb className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-display">
                Quick Tips & Shortcuts 💡
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground">
                Smart tricks to save time and work faster
              </p>
            </div>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex gap-1.5 p-2 px-3 sm:px-4 bg-secondary/30 border-b border-border/30 overflow-x-auto no-scrollbar">
          {TIP_CATEGORIES.map((cat) => {
            const isActive = activeTab === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                  isActive
                    ? "bg-card text-foreground shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                <Icon className="size-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tips Content Stream */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {currentCategory.tips.map((tip, idx) => {
            const Icon = tip.icon;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border border-border/50 bg-card hover:bg-secondary/20 transition-all space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("size-7 rounded-xl flex items-center justify-center border", currentCategory.color)}>
                      <Icon className="size-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        {tip.title}
                      </h4>
                    </div>
                  </div>

                  {tip.badge && (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {tip.badge}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed pl-9">
                  {tip.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="p-3 border-t border-border/30 bg-muted/20 text-center">
          <p className="text-[10px] text-muted-foreground">
            💡 Pro-Tip: You can open this guide anytime from the top bar or Settings menu!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
