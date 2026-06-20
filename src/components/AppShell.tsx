import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { useStore, totalDue, fmtINR, formatAppDate, formatAppTime, formatAppDateTime } from "@/lib/store";
import logoAsset from "@/assets/eyas-logo.png";
import { waitForAppUser } from "@/integrations/firebase/client";
import {
  CloudOff,
  RefreshCw,
  AlertCircle,
  Check,
  Calendar,
  Clock,
  Wallet,
  X,
  ChevronRight,
  AlertTriangle,
  Search,
  User,
  Receipt,
  IndianRupee,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}

export function AppShell({ title, subtitle, children, wide }: Props) {
  const settings = useStore((s) => s.settings);
  const logo = settings.logoDataUrl || logoAsset;
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const payments = useStore((s) => s.payments);

  const navigate = useNavigate();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "customers" | "bookings" | "payments">("all");

  const resultsRef = useRef<HTMLDivElement>(null);

  // Scroll to top when search query or active tab changes
  useEffect(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollTop = 0;
    }
  }, [searchQuery, activeTab]);

  // Listen for open-global-search event
  useEffect(() => {
    const handleOpenSearch = () => {
      setShowSearchModal(true);
      setActiveTab("all");
    };
    window.addEventListener("open-global-search", handleOpenSearch);
    return () => window.removeEventListener("open-global-search", handleOpenSearch);
  }, []);

  const [sync, setSync] = useState(() => {
    if (typeof window !== "undefined" && (window as any).__syncStatus) {
      return (window as any).__syncStatus;
    }
    return { syncStatus: "synced", showStatus: false, errorMessage: "" };
  });

  const [isGuest, setIsGuest] = useState(false);

  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!showSearchModal) {
      setViewportHeight(null);
      return;
    }
    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };
    updateHeight();
    window.visualViewport?.addEventListener("resize", updateHeight);
    window.visualViewport?.addEventListener("scroll", updateHeight);
    window.addEventListener("resize", updateHeight);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateHeight);
      window.visualViewport?.removeEventListener("scroll", updateHeight);
      window.removeEventListener("resize", updateHeight);
    };
  }, [showSearchModal]);

  useEffect(() => {
    waitForAppUser(300).then((user) => {
      setIsGuest(!!user?.isAnonymous);
    });
  }, []);

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

  const isToday = (dateStr: string) => {
    try {
      const d = format(parseISO(dateStr), "yyyy-MM-dd");
      const today = format(new Date(), "yyyy-MM-dd");
      return d === today;
    } catch {
      return false;
    }
  };

  const getCustomerName = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    return cust?.name || "Client";
  };

  // Perform search across customers, bookings, and payments
  const getSearchResults = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { customers: [], bookings: [], payments: [] };

    const digitsOnlyQ = q.replace(/\D/g, "");

    // 1. Search Customers
    const seenCustomers = new Set<string>();
    const filteredCustomers = customers.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const digitsOnlyPhone = c.phone.replace(/\D/g, "");
      const phoneMatch = digitsOnlyQ ? digitsOnlyPhone.includes(digitsOnlyQ) : c.phone.includes(q);
      const addressMatch = c.address ? c.address.toLowerCase().includes(q) : false;
      const refMatch = c.reference ? c.reference.toLowerCase().includes(q) : false;
      
      const isMatched = nameMatch || phoneMatch || addressMatch || refMatch;
      if (!isMatched) return false;
      
      const key = `${c.name.toLowerCase()}_${c.phone || ""}`;
      if (seenCustomers.has(key)) return false;
      seenCustomers.add(key);
      return true;
    });

    // 2. Search Bookings
    const filteredBookings = bookings.filter((b) => {
      const cust = customers.find((c) => c.id === b.customerId);
      const custName = cust?.name.toLowerCase() || "";
      const digitsOnlyPhone = cust?.phone.replace(/\D/g, "") || "";
      const phoneMatch = digitsOnlyQ ? digitsOnlyPhone.includes(digitsOnlyQ) : (cust?.phone.includes(q) || false);
      const billNum = b.billNumber?.toLowerCase() || b.id.toLowerCase();
      const notes = b.notes?.toLowerCase() || "";
      const service = b.service.toLowerCase();
      
      return (
        billNum.includes(q) ||
        service.includes(q) ||
        notes.includes(q) ||
        custName.includes(q) ||
        phoneMatch
      );
    });

    // 3. Search Payments
    const allPayments = payments;
    const filteredPayments = allPayments.filter((p) => {
      const b = bookings.find((bk) => bk.id === p.bookingId);
      const billNum = b?.billNumber?.toLowerCase() || "";
      const cust = b ? customers.find((c) => c.id === b.customerId) : null;
      const custName = cust?.name.toLowerCase() || "";
      const digitsOnlyPhone = cust?.phone.replace(/\D/g, "") || "";
      const phoneMatch = digitsOnlyQ ? digitsOnlyPhone.includes(digitsOnlyQ) : (cust?.phone.includes(q) || false);
      const note = p.note?.toLowerCase() || "";
      const mode = p.mode?.toLowerCase() || "";
      
      return (
        billNum.includes(q) ||
        custName.includes(q) ||
        phoneMatch ||
        note.includes(q) ||
        mode.includes(q) ||
        String(p.amount).includes(q)
      );
    });

    return {
      customers: filteredCustomers,
      bookings: filteredBookings,
      payments: filteredPayments,
    };
  };

  const searchResults = useMemo(() => {
    return getSearchResults();
  }, [searchQuery, customers, bookings, payments]);

  // Selectors for Notification Hub Dashboard
  const todayBookings = bookings.filter(
    (b) => b.status !== "cancelled" && isToday(b.deliveryDate)
  );

  const upcomingBookings = bookings
    .filter(
      (b) =>
        b.status !== "cancelled" &&
        b.status !== "delivered" &&
        !isToday(b.deliveryDate) &&
        new Date(b.deliveryDate) >= new Date(),
    )
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
    .slice(0, 3);

  const outstandingBookings = bookings
    .filter(
      (b) => b.status !== "cancelled" && b.status !== "delivered" && totalDue(b) > 0,
    )
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
    .slice(0, 3);

  // Expanding Status Pill states, refs & effects
  const [currentNotification, setCurrentNotification] = useState<{
    type: string;
    text: string;
    icon: string;
    color: string;
  } | null>(null);
  const [showPill, setShowPill] = useState(false);
  const lastStatusRef = useRef(sync.syncStatus);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeIndexRef = useRef(0);

  const getNotificationItems = () => {
    const items = [];

    // 1. Connection / Sync item
    if (sync.showStatus || sync.syncStatus === "error") {
      if (sync.syncStatus === "syncing") {
        items.push({
          type: "sync",
          text: "Syncing...",
          icon: "syncing",
          color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        });
      } else if (sync.syncStatus === "offline") {
        items.push({
          type: "sync",
          text: "Offline Mode",
          icon: "offline",
          color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        });
      } else if (sync.syncStatus === "error") {
        items.push({
          type: "sync",
          text: sync.errorMessage || "Sync Error",
          icon: "error",
          color: "text-red-500 bg-red-500/15 border-red-500/30",
        });
      } else {
        items.push({
          type: "sync",
          text: isGuest ? "Local Synced" : "Cloud Synced",
          icon: "synced",
          color: "text-success bg-[oklch(0.55_0.13_150)]/[0.08] border-[oklch(0.55_0.13_150)]/20",
        });
      }
    }

    // 2. Today's Bookings
    if (todayBookings.length > 0) {
      items.push({
        type: "today",
        text: `${todayBookings.length} Bookings Today`,
        icon: "calendar",
        color: "text-primary bg-primary/10 border-primary/20",
      });
    }

    // 3. Next Booking
    const nextB = bookings
      .filter(
        (b) =>
          b.status !== "cancelled" &&
          b.status !== "delivered" &&
          new Date(b.deliveryDate) >= new Date(),
      )
      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))[0];
      
    if (nextB) {
      const cust = customers.find((c) => c.id === nextB.customerId);
      const dateStr = formatAppDate(nextB.deliveryDate);
      const timeStr = nextB.deliveryTime ? ` @ ${formatAppTime(nextB.deliveryTime)}` : "";
      items.push({
        type: "next",
        text: `Next: ${cust?.name || "Client"} · ${dateStr}${timeStr}`,
        icon: "clock",
        color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
      });
    }

    // 4. Outstanding Dues
    const dueMap = new Map<string, { name: string; totalDue: number }>();
    for (const b of bookings) {
      if (b.status === "cancelled" || b.status === "delivered") continue;
      const due = totalDue(b);
      if (due <= 0) continue;
      const c = customers.find((x) => x.id === b.customerId);
      const name = c?.name || "Unknown";
      const key = b.customerId || b.id;
      const existing = dueMap.get(key);
      if (existing) {
        existing.totalDue += due;
      } else {
        dueMap.set(key, { name, totalDue: due });
      }
    }
    const sortedDues = Array.from(dueMap.values()).sort((a, b) => b.totalDue - a.totalDue);
    
    if (sortedDues.length > 0) {
      const namesStr = sortedDues.map((item) => `${item.name} (${fmtINR(item.totalDue)})`).join(" · ");
      items.push({
        type: "due",
        text: `Dues: ${namesStr}`,
        icon: "wallet",
        color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
      });
    }

    return items;
  };

  const triggerPillCycle = (item: typeof currentNotification, durationMs = 4000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentNotification(item);
    setShowPill(true);
    const duration = (item?.text.length || 0) > 20 ? 8000 : durationMs;
    timerRef.current = setTimeout(() => {
      setShowPill(false);
    }, duration);
  };

  // 1. Listen for sync changes to show instant feedback
  useEffect(() => {
    if (sync.syncStatus !== lastStatusRef.current) {
      lastStatusRef.current = sync.syncStatus;
      const items = getNotificationItems();
      const syncItem = items.find((x) => x.type === "sync");
      if (syncItem) {
        triggerPillCycle(syncItem, 5000);
      }
    }
  }, [sync.syncStatus]);

  // 2. Periodic background notifications ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const items = getNotificationItems();
      if (items.length === 0) return;
      
      activeIndexRef.current = (activeIndexRef.current + 1) % items.length;
      const nextItem = items[activeIndexRef.current];
      triggerPillCycle(nextItem, 4000);
    }, 12000);

    // Run once on load to show sync status
    const items = getNotificationItems();
    if (items.length > 0) {
      triggerPillCycle(items[0], 4000);
    }

    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [bookings, sync.syncStatus, customers]);

  const currentText = currentNotification?.text || "";
  const isLongText = currentText.length > 20;

  return (
    <div className="min-h-[100dvh] bg-background pb-28">
      <div className={wide ? "max-w-3xl mx-auto" : "max-w-md mx-auto"}>
        {/* Uniform brand strip — every page */}
        <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/10 safe-header-top px-5 pb-2 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={logo}
              alt={settings.businessName}
              className="size-8 rounded-full object-cover scale-[1.18] ring-1 ring-primary/25 shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <p className="text-[13px] font-display font-semibold tracking-tight truncate">
                {settings.businessName}
              </p>
              <HeaderClock
                dateFormat={settings.dateFormat || "DD-MM-YYYY"}
                timeFormat={settings.timeFormat || "12"}
              />
            </div>
          </div>

          <div className="flex items-center ml-auto shrink-0 min-w-0">
            {/* Sliding expanding pill */}
            <div
              onClick={() => {
                setShowSearchModal(true);
                setActiveTab("all");
              }}
              className={cn(
                "h-8.5 rounded-full border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-500 ease-in-out cursor-pointer overflow-hidden origin-right",
                showPill && currentNotification
                  ? "max-w-[150px] xs:max-w-[180px] px-3 opacity-100 mr-2 border-border/10 scale-100"
                  : "max-w-0 px-0 opacity-0 mr-0 border-transparent scale-95",
                currentNotification?.color,
              )}
            >
              {currentNotification?.icon === "syncing" && (
                <RefreshCw className="size-2.5 animate-spin shrink-0" />
              )}
              {currentNotification?.icon === "offline" && <CloudOff className="size-2.5 shrink-0" />}
              {currentNotification?.icon === "error" && (
                <AlertCircle className="size-2.5 animate-shake-sm text-red-500 shrink-0" />
              )}
              {currentNotification?.icon === "synced" && <Check className="size-2.5 shrink-0" />}
              {currentNotification?.icon === "calendar" && (
                <Calendar className="size-2.5 text-primary shrink-0" />
              )}
              {currentNotification?.icon === "clock" && (
                <Clock className="size-2.5 text-indigo-500 shrink-0" />
              )}
              {currentNotification?.icon === "wallet" && (
                <Wallet className="size-2.5 text-rose-500 shrink-0" />
              )}
              {isLongText ? (
                <div key={currentText} className="w-[110px] xs:w-[135px] overflow-hidden h-8.5 relative shrink-0">
                  <div className="absolute inset-x-0 w-full animate-scroll-up-continuous flex flex-col justify-start">
                    <span className="whitespace-normal leading-tight text-[9px] pt-[34px] pb-1 font-medium">
                      {currentText}
                    </span>
                  </div>
                </div>
              ) : (
                <span 
                  key={currentText} 
                  className="truncate whitespace-nowrap inline-block animate-slide-up-single"
                >
                  {currentText}
                </span>
              )}
            </div>

            {/* Global Search Button */}
            <button
              onClick={() => {
                setShowSearchModal(true);
                setActiveTab("all");
              }}
              className="relative size-10 rounded-full bg-secondary hover:bg-secondary/80 border border-border/10 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition cursor-pointer shrink-0"
              title={
                sync.syncStatus === "synced"
                  ? (isGuest ? "Saved Locally (Tap to search)" : "Database Synced (Tap to search)")
                  : sync.syncStatus === "syncing"
                  ? "Syncing... (Tap to search)"
                  : sync.syncStatus === "offline"
                  ? "Offline Mode (Tap to search)"
                  : "Sync Error! Tap to resolve"
              }
            >
              <Search className="size-5 text-primary" strokeWidth={2.5} />
              
              {/* Sync Status Badge Dot */}
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center">
                {sync.syncStatus === "syncing" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                )}
                {sync.syncStatus === "error" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-2.5 w-2.5 border border-background shadow-xs",
                    sync.syncStatus === "synced" && "bg-emerald-500",
                    sync.syncStatus === "syncing" && "bg-blue-500",
                    sync.syncStatus === "offline" && "bg-amber-500",
                    sync.syncStatus === "error" && "bg-red-500",
                  )}
                />
              </span>
            </button>
          </div>
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
            @keyframes slide-up-cycle {
              0% { transform: translateY(8px); opacity: 0; }
              12% { transform: translateY(0); opacity: 1; }
              88% { transform: translateY(0); opacity: 1; }
              100% { transform: translateY(-8px); opacity: 0; }
            }
            .animate-slide-up-cycle {
              animation: slide-up-cycle 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes slide-up-single {
              0% { transform: translateY(8px); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
            .animate-slide-up-single {
              animation: slide-up-single 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes scroll-up-continuous {
              0% { transform: translateY(0); }
              100% { transform: translateY(-100%); }
            }
            .animate-scroll-up-continuous {
              animation: scroll-up-continuous 7s linear forwards;
            }
          `}</style>
        </div>

        {title && (
          <header className="px-5 pt-2 pb-3">
            <h1 className="text-xl font-display font-semibold tracking-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </header>
        )}
        <main className="px-5">{children}</main>
        <p className="text-center text-[10px] text-muted-foreground/70 mt-8 pb-2">
          Developed by{" "}
          <a
            href="https://www.instagram.com/maniraja__/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary/80 hover:underline"
          >
            ManiRaja
          </a>
        </p>
      </div>
      <BottomNav />

      {/* Global Search Popup Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-x-0 top-0 z-50 bg-background flex flex-col pt-[calc(env(safe-area-inset-top,0px)+4px)] animate-in fade-in duration-200 text-left"
          style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={cn("w-full flex-1 flex flex-col mx-auto", wide ? "max-w-3xl" : "max-w-md")}>
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-border/10 flex items-center gap-3 bg-card shrink-0">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search phone, bill, customer details..."
                  autoFocus
                  className="w-full bg-secondary text-foreground border border-border/40 rounded-xl py-2 pl-9 pr-9 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-muted-foreground"
                />
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" strokeWidth={2.5} />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2 size-6 rounded-full hover:bg-secondary/80 flex items-center justify-center text-muted-foreground cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery("");
                }}
                className="text-sm font-semibold text-primary px-1 hover:opacity-80 active:scale-95 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Tabs */}
            {searchQuery && (
              <div className="px-4 py-2 border-b border-border/10 bg-card flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <button
                  onClick={() => setActiveTab("all")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition",
                    activeTab === "all"
                      ? "saree-gradient text-white"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  All ({searchResults.customers.length + searchResults.bookings.length + searchResults.payments.length})
                </button>
                <button
                  onClick={() => setActiveTab("customers")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition",
                    activeTab === "customers"
                      ? "saree-gradient text-white"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  Customers ({searchResults.customers.length})
                </button>
                <button
                  onClick={() => setActiveTab("bookings")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition",
                    activeTab === "bookings"
                      ? "saree-gradient text-white"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  Bookings ({searchResults.bookings.length})
                </button>
                <button
                  onClick={() => setActiveTab("payments")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition",
                    activeTab === "payments"
                      ? "saree-gradient text-white"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  Payments ({searchResults.payments.length})
                </button>
              </div>
            )}

            {/* Results Area */}
            <div ref={resultsRef} className="px-4 py-4 overflow-y-auto flex-1 bg-background/30">
              {!searchQuery ? (
                <div className="space-y-5 pb-20">
                  {/* Dashboard / Notification Hub inside Search */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      System Sync Status
                    </h3>
                    {/* Sync Status Card */}
                    <div
                      className={cn(
                        "p-3 rounded-2xl border flex flex-col gap-2 transition-all",
                        sync.syncStatus === "synced" &&
                          "bg-[oklch(0.55_0.13_150)]/[0.04] border-[oklch(0.55_0.13_150)]/15 text-[oklch(0.55_0.13_150)]",
                        sync.syncStatus === "syncing" &&
                          "bg-blue-500/[0.04] border-blue-500/15 text-blue-500",
                        sync.syncStatus === "offline" &&
                          "bg-amber-500/[0.04] border-amber-500/15 text-amber-500",
                        sync.syncStatus === "error" && "bg-red-500/[0.04] border-red-500/20 text-red-500",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {sync.syncStatus === "syncing" && <RefreshCw className="size-4 animate-spin" />}
                        {sync.syncStatus === "offline" && (
                          <CloudOff className="size-4 animate-bounce-slow" />
                        )}
                        {sync.syncStatus === "error" && (
                          <AlertTriangle className="size-4 animate-shake-sm" />
                        )}
                        {sync.syncStatus === "synced" && <Check className="size-4 stroke-[3]" />}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {sync.syncStatus === "synced" &&
                            (isGuest ? "Saved Locally" : "Database Synced")}
                          {sync.syncStatus === "syncing" &&
                            (isGuest ? "Saving Locally..." : "Syncing Data...")}
                          {sync.syncStatus === "offline" && "Offline Mode Active"}
                          {sync.syncStatus === "error" &&
                            (isGuest ? "Local Save Error" : "Database Sync Error")}
                        </span>
                      </div>

                      <p className="text-[10px] text-muted-foreground/90 leading-normal">
                        {sync.syncStatus === "synced" &&
                          (isGuest
                            ? "All records are fully updated and saved securely on your device."
                            : "All records are fully updated and saved securely to the cloud.")}
                        {sync.syncStatus === "syncing" &&
                          (isGuest
                            ? "We are saving your changes locally."
                            : "We are uploading your changes and pulling the latest updates.")}
                        {sync.syncStatus === "offline" &&
                          "No connection. You can keep editing; changes will auto-sync when online."}
                        {sync.syncStatus === "error" &&
                          (isGuest
                            ? "Failed to save data locally. Check your device storage."
                            : "Failed to connect to the cloud database. Tap retry to reconnect.")}
                      </p>

                      {sync.syncStatus === "error" && (
                        <div className="mt-1 space-y-2">
                          <p className="text-[9px] font-mono bg-destructive/5 text-destructive border border-destructive/10 rounded-lg p-2 max-h-16 overflow-y-auto whitespace-pre-wrap leading-tight">
                            {sync.errorMessage || "Network connection interrupted or session expired."}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              window.dispatchEvent(new Event("sync-retry"));
                            }}
                            className="w-full py-1.5 rounded-lg bg-red-500 text-white font-bold text-[9px] uppercase tracking-wider hover:bg-red-600 active:scale-95 transition cursor-pointer"
                          >
                            Retry Connection
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Today's Bookings */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Calendar className="size-3 text-primary/80" /> Today's Bookings
                    </h3>
                    {todayBookings.length > 0 ? (
                      <div className="space-y-2">
                        {todayBookings.map((b) => (
                          <Link
                            key={b.id}
                            to="/bookings/$id"
                            params={{ id: b.id }}
                            onClick={() => {
                              setShowSearchModal(false);
                              setSearchQuery("");
                            }}
                            className="flex justify-between items-center p-3 rounded-2xl bg-secondary/35 border border-border/15 hover:bg-secondary/65 transition cursor-pointer text-left w-full animate-in slide-in-from-bottom-1"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-semibold truncate">
                                {getCustomerName(b.customerId)}
                              </p>
                              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                                {b.service === "prepleat" ? "PrePleat Saree" : "Saree Drape"} · {b.sareeCount} {b.sareeCount === 1 ? "Saree" : "Sarees"}
                              </p>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-1.5">
                              <div>
                                <p className="text-[10px] font-bold">{b.deliveryTime}</p>
                                <p className="text-[9px] text-success font-semibold">
                                  {fmtINR(b.totalAmount)}
                                </p>
                              </div>
                              <ChevronRight className="size-3 text-muted-foreground" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3.5 bg-secondary/15 rounded-2xl border border-border/10 text-center">
                        <p className="text-[10px] text-muted-foreground/80">
                          No bookings scheduled for today.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Next Upcoming Bookings */}
                  {upcomingBookings.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Clock className="size-3 text-indigo-500/80" /> Next Upcoming Bookings
                      </h3>
                      <div className="space-y-2">
                        {upcomingBookings.map((b) => (
                          <Link
                            key={b.id}
                            to="/bookings/$id"
                            params={{ id: b.id }}
                            onClick={() => {
                              setShowSearchModal(false);
                              setSearchQuery("");
                            }}
                            className="flex justify-between items-center p-3 rounded-2xl bg-secondary/35 border border-border/15 hover:bg-secondary/65 transition cursor-pointer text-left w-full animate-in slide-in-from-bottom-1"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-semibold truncate">
                                {getCustomerName(b.customerId)}
                              </p>
                              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                                {formatAppDate(b.deliveryDate)} · {formatAppTime(b.deliveryTime)}
                              </p>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-1.5">
                              <ChevronRight className="size-3 text-muted-foreground" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Outstanding Payments */}
                  {outstandingBookings.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Wallet className="size-3 text-rose-500/80" /> Outstanding Payments
                      </h3>
                      <div className="space-y-2">
                        {outstandingBookings.map((b) => (
                          <Link
                            key={b.id}
                            to="/bookings/$id"
                            params={{ id: b.id }}
                            onClick={() => {
                              setShowSearchModal(false);
                              setSearchQuery("");
                            }}
                            className="flex justify-between items-center p-3 rounded-2xl bg-secondary/35 border border-border/15 hover:bg-secondary/65 transition cursor-pointer text-left w-full animate-in slide-in-from-bottom-1"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-semibold truncate">
                                {getCustomerName(b.customerId)}
                              </p>
                              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                                Total: {fmtINR(b.totalAmount)}
                              </p>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-1.5">
                              <div>
                                <p className="text-[10px] font-bold text-destructive">
                                  {fmtINR(totalDue(b))} due
                                </p>
                              </div>
                              <ChevronRight className="size-3 text-muted-foreground" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (searchResults.customers.length + searchResults.bookings.length + searchResults.payments.length) === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No matches found for "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-4 pb-20">
                  {/* Category: Customers */}
                  {(activeTab === "all" || activeTab === "customers") && searchResults.customers.length > 0 && (
                    <div>
                      {activeTab === "all" && (
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <User className="size-3 text-primary/80" /> Customers
                        </h4>
                      )}
                      <div className="space-y-2">
                        {searchResults.customers.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              navigate({ to: `/customers/${c.id}` });
                              setShowSearchModal(false);
                              setSearchQuery("");
                            }}
                            className="w-full text-left bg-secondary/35 hover:bg-secondary/65 border border-border/10 rounded-2xl p-3 flex items-center justify-between transition cursor-pointer"
                          >
                            <div className="min-w-0 pr-2 flex-1">
                              <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="size-3" /> {c.phone}
                              </p>
                              {c.address && (
                                <p className="text-[10px] text-muted-foreground/80 mt-0.5 truncate">
                                  {c.address}
                                </p>
                              )}
                              {c.reference && (
                                <p className="text-[10px] text-primary/80 truncate mt-0.5">
                                  ref: {c.reference}
                                </p>
                              )}
                              {c.measurements && c.measurements.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-border/10">
                                  {c.measurements.map((m, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground font-semibold"
                                    >
                                      {m.label}: <span className="text-foreground font-bold">{m.value}"</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 self-start mt-0.5">
                              {c.kind ?? "client"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Bookings */}
                  {(activeTab === "all" || activeTab === "bookings") && searchResults.bookings.length > 0 && (
                    <div>
                      {activeTab === "all" && (
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 mt-2 flex items-center gap-1.5">
                          <Receipt className="size-3 text-primary/80" /> Bookings
                        </h4>
                      )}
                      <div className="space-y-2">
                        {searchResults.bookings.map((b) => {
                          const cust = customers.find((c) => c.id === b.customerId);
                          const due = totalDue(b);
                          return (
                            <button
                              key={b.id}
                              onClick={() => {
                                navigate({ to: `/bookings/${b.id}` });
                                setShowSearchModal(false);
                                setSearchQuery("");
                              }}
                              className="w-full text-left bg-secondary/35 hover:bg-secondary/65 border border-border/10 rounded-2xl p-3 flex items-center justify-between transition cursor-pointer"
                            >
                              <div className="min-w-0 pr-2 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-sm text-foreground truncate">
                                    {cust?.name || "Client"}
                                  </span>
                                  <span className="text-[9px] bg-secondary/70 px-1.5 py-0.5 rounded font-mono text-muted-foreground shrink-0">
                                    #{b.billNumber || b.id.slice(0, 6).toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {b.service === "prepleat" ? "PrePleat Saree" : "Saree Drape"} · {b.sareeCount} saree{b.sareeCount !== 1 && "s"}
                                </p>
                                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                                  Delivery: {formatAppDate(b.deliveryDate)}
                                </p>
                                {b.notes && (
                                  <p className="text-[10px] text-muted-foreground/80 mt-0.5 italic truncate">
                                    Note: {b.notes}
                                  </p>
                                )}
                                {b.measurements && b.measurements.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-border/10">
                                    {b.measurements.map((m, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground font-semibold"
                                      >
                                        {m.label}: <span className="text-foreground font-bold">{m.value}"</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-right shrink-0 flex flex-col items-end gap-1.5 pl-2">
                                <span className="text-[9px] font-bold bg-secondary/80 border border-border/10 px-2 py-0.5 rounded-full uppercase tracking-wider text-foreground">
                                  {b.status}
                                </span>
                                <div className="text-xs font-semibold tabular-nums text-foreground">
                                  {fmtINR(b.totalAmount)}
                                </div>
                                {due > 0 ? (
                                  <div className="text-[10px] text-destructive font-bold">
                                    {fmtINR(due)} due
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-success font-bold">Paid</div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category: Payments */}
                  {(activeTab === "all" || activeTab === "payments") && searchResults.payments.length > 0 && (
                    <div>
                      {activeTab === "all" && (
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 mt-2 flex items-center gap-1.5">
                          <IndianRupee className="size-3 text-primary/80" /> Payments
                        </h4>
                      )}
                      <div className="space-y-2">
                        {searchResults.payments.map((p) => {
                          const b = bookings.find((bk) => bk.id === p.bookingId);
                          const cust = b ? customers.find((c) => c.id === b.customerId) : null;
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                navigate({ to: `/bookings/${p.bookingId}` });
                                setShowSearchModal(false);
                                setSearchQuery("");
                              }}
                              className="w-full text-left bg-secondary/35 hover:bg-secondary/65 border border-border/10 rounded-2xl p-3 flex items-center justify-between transition cursor-pointer"
                            >
                              <div className="min-w-0 pr-2 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-sm text-primary">
                                    {fmtINR(p.amount)}
                                  </span>
                                  <span className="text-[9px] bg-secondary/70 px-1.5 py-0.5 rounded text-muted-foreground font-semibold">
                                    {(p.mode ?? "gpay").toUpperCase()}
                                  </span>
                                  {b?.billNumber && (
                                    <span className="text-[9px] bg-secondary/70 px-1.5 py-0.5 rounded font-mono text-muted-foreground shrink-0">
                                      #{b.billNumber.split("-").pop()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-foreground mt-0.5 truncate">
                                  Billed To: {cust?.name || "Client"}
                                </p>
                                {p.note && (
                                  <p className="text-[10px] text-muted-foreground/80 mt-0.5 italic truncate">
                                    Note: {p.note}
                                  </p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Date: {formatAppDate(p.date)}
                                </p>
                              </div>
                              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderClock({ dateFormat, timeFormat }: { dateFormat: string; timeFormat: string }) {
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentDateTimeStr = useMemo(() => {
    let dFmt = dateFormat || "DD-MM-YYYY";
    if (dFmt === "DD-MM-YYYY") dFmt = "dd-MM-yyyy";
    if (dFmt === "YYYY-MM-DD") dFmt = "yyyy-MM-dd";
    if (dFmt === "MM/DD/YYYY") dFmt = "MM/dd/yyyy";

    const datePart = format(currentDateTime, dFmt);
    const timePart = format(currentDateTime, timeFormat === "24" ? "HH:mm:ss" : "hh:mm:ss a");
    return `${datePart} · ${timePart}`;
  }, [currentDateTime, dateFormat, timeFormat]);

  return (
    <p className="text-[8.5px] text-muted-foreground/90 font-mono font-medium tracking-tight mt-0.5 leading-none shrink-0">
      {currentDateTimeStr}
    </p>
  );
}
