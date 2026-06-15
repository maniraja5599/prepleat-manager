import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "./BottomNav";
import { useStore, totalDue, fmtINR } from "@/lib/store";
import logoAsset from "@/assets/eyas-logo.png";
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
  /** @deprecated brand strip now renders on every page automatically */
  showBrand?: boolean;
  wide?: boolean;
  showFloatingSearch?: boolean;
}

export function AppShell({ title, subtitle, children, wide, showFloatingSearch }: Props) {
  const settings = useStore((s) => s.settings);
  const logo = settings.logoDataUrl || logoAsset;
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);

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

  const [sync, setSync] = useState(() => {
    if (typeof window !== "undefined" && (window as any).__syncStatus) {
      return (window as any).__syncStatus;
    }
    return { syncStatus: "synced", showStatus: false, errorMessage: "" };
  });

  const [showPopup, setShowPopup] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerItems, setTickerItems] = useState<
    Array<{ type: string; text: string; icon: string; color: string }>
  >([]);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.is_anonymous) {
        setIsGuest(true);
      }
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

  const getNextBooking = () => {
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const upcoming = bookings
        .filter(
          (b) =>
            b.status !== "cancelled" &&
            b.status !== "delivered" &&
            format(parseISO(b.deliveryDate), "yyyy-MM-dd") >= todayStr,
        )
        .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
      return upcoming[0];
    } catch {
      return null;
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
    const filteredCustomers = customers.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const digitsOnlyPhone = c.phone.replace(/\D/g, "");
      const phoneMatch = digitsOnlyQ ? digitsOnlyPhone.includes(digitsOnlyQ) : c.phone.includes(q);
      const addressMatch = c.address ? c.address.toLowerCase().includes(q) : false;
      const refMatch = c.reference ? c.reference.toLowerCase().includes(q) : false;
      
      return nameMatch || phoneMatch || addressMatch || refMatch;
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
    const allPayments = useStore.getState().payments;
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

  useEffect(() => {
    const todayCount = bookings.filter(
      (b) => b.status !== "cancelled" && isToday(b.deliveryDate),
    ).length;
    const nextB = getNextBooking();
    const dueCount = bookings.filter(
      (b) => b.status !== "cancelled" && b.status !== "delivered" && totalDue(b) > 0,
    ).length;

    const items = [];

    // 1. Connection / Sync item
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
        text: "Sync Error",
        icon: "error",
        color: "text-red-500 bg-red-500/15 border-red-500/30",
      });
    } else {
      items.push({
        type: "sync",
        text: isGuest ? "Local Synced" : "Cloud Synced",
        icon: "synced",
        color: "text-success bg-success/10 border-success/20",
      });
    }

    // 2. Today's Bookings
    if (todayCount > 0) {
      items.push({
        type: "today",
        text: `${todayCount} ${todayCount === 1 ? "Booking" : "Bookings"} Today`,
        icon: "calendar",
        color: "text-primary bg-primary/10 border-primary/20",
      });
    }

    // 3. Next Booking
    if (nextB) {
      const cust = customers.find((c) => c.id === nextB.customerId);
      const timeStr = nextB.deliveryTime ? nextB.deliveryTime : "";
      items.push({
        type: "next",
        text: `Next: ${cust?.name || "Client"} @ ${timeStr}`,
        icon: "clock",
        color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
      });
    }

    // 4. Due Payments
    if (dueCount > 0) {
      items.push({
        type: "due",
        text: `${dueCount} Pending Dues`,
        icon: "wallet",
        color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
      });
    }

    setTickerItems(items);
  }, [bookings, sync, customers, isGuest]);

  // Rotate ticker index
  useEffect(() => {
    if (tickerItems.length <= 1) {
      setTickerIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerItems.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [tickerItems]);

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
            <p className="text-[13px] font-display font-semibold tracking-tight truncate shrink-0">
              {settings.businessName}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0 min-w-0">
            {showFloatingSearch && (
              <button
                onClick={() => {
                  setShowSearchModal(true);
                  setActiveTab("all");
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary hover:bg-secondary/80 border border-border/10 text-muted-foreground text-[10px] font-bold uppercase tracking-wider active:scale-95 transition cursor-pointer shrink-0"
                title="Global Search"
              >
                <Search className="size-3 text-primary" />
                <span>Search</span>
              </button>
            )}

            {/* Live Info Ticker (rendered in top-right slot) */}
            {tickerItems.length > 0 && (
              <button
                onClick={() => setShowPopup(true)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all duration-300 animate-in fade-in slide-in-from-right-2 cursor-pointer max-w-[100px] xs:max-w-[140px] sm:max-w-none truncate hover:brightness-95 active:scale-95 shrink-0",
                  tickerItems[tickerIndex]?.color,
                )}
              >
                {tickerItems[tickerIndex]?.icon === "syncing" && (
                  <RefreshCw className="size-2.5 animate-spin" />
                )}
                {tickerItems[tickerIndex]?.icon === "offline" && <CloudOff className="size-2.5" />}
                {tickerItems[tickerIndex]?.icon === "error" && (
                  <AlertCircle className="size-2.5 animate-shake-sm text-red-500" />
                )}
                {tickerItems[tickerIndex]?.icon === "synced" && <Check className="size-2.5" />}
                {tickerItems[tickerIndex]?.icon === "calendar" && (
                  <Calendar className="size-2.5 text-primary" />
                )}
                {tickerItems[tickerIndex]?.icon === "clock" && (
                  <Clock className="size-2.5 text-indigo-500" />
                )}
                {tickerItems[tickerIndex]?.icon === "wallet" && (
                  <Wallet className="size-2.5 text-rose-500" />
                )}
                <span className="truncate">{tickerItems[tickerIndex]?.text}</span>
              </button>
            )}

            {/* Fallback gold dot if ticker is empty */}
            {tickerItems.length === 0 && (
              <div className="shrink-0 flex items-center">
                <span
                  className="size-1.5 rounded-full bg-gold/60 animate-in fade-in duration-300"
                  aria-hidden
                />
              </div>
            )}
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

      {/* Notification Hub Popup Modal */}
      {showPopup && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-start justify-center p-4 pt-16 animate-in fade-in duration-200"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="w-full max-w-sm bg-card/95 backdrop-blur-md rounded-2xl border border-border/30 shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-border/20 flex items-center justify-between bg-secondary/35">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Notification Hub
                </h3>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  Real-time alerts and shortcuts
                </p>
              </div>
              <button
                onClick={() => setShowPopup(false)}
                className="size-7 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Sync Status Card */}
              <div
                className={cn(
                  "p-3 rounded-xl border flex flex-col gap-2 transition-all",
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

              {/* Today's Bookings */}
              {bookings.filter((b) => b.status !== "cancelled" && isToday(b.deliveryDate)).length >
              0 ? (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Today's Bookings
                  </h4>
                  <div className="space-y-1">
                    {bookings
                      .filter((b) => b.status !== "cancelled" && isToday(b.deliveryDate))
                      .map((b) => (
                        <Link
                          key={b.id}
                          to="/bookings/$id"
                          params={{ id: b.id }}
                          onClick={() => setShowPopup(false)}
                          className="flex justify-between items-center p-2.5 rounded-xl bg-secondary/35 border border-border/15 hover:bg-secondary/65 transition cursor-pointer text-left animate-in slide-in-from-bottom-1"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold truncate">
                              {getCustomerName(b.customerId)}
                            </p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                              {b.service} · {b.sareeCount} {b.sareeCount === 1 ? "Saree" : "Sarees"}
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
                </div>
              ) : (
                <div className="p-3 bg-secondary/15 rounded-xl border border-border/10 text-center">
                  <p className="text-[10px] text-muted-foreground/80">
                    No bookings scheduled for today.
                  </p>
                </div>
              )}

              {/* Next Upcoming Booking */}
              {bookings.filter(
                (b) =>
                  b.status !== "cancelled" &&
                  b.status !== "delivered" &&
                  !isToday(b.deliveryDate) &&
                  new Date(b.deliveryDate) >= new Date(),
              ).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Next Upcoming Bookings
                  </h4>
                  <div className="space-y-1">
                    {bookings
                      .filter(
                        (b) =>
                          b.status !== "cancelled" &&
                          b.status !== "delivered" &&
                          !isToday(b.deliveryDate) &&
                          new Date(b.deliveryDate) >= new Date(),
                      )
                      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
                      .slice(0, 3)
                      .map((b) => (
                        <Link
                          key={b.id}
                          to="/bookings/$id"
                          params={{ id: b.id }}
                          onClick={() => setShowPopup(false)}
                          className="flex justify-between items-center p-2.5 rounded-xl bg-secondary/35 border border-border/15 hover:bg-secondary/65 transition cursor-pointer text-left animate-in slide-in-from-bottom-1"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold truncate">
                              {getCustomerName(b.customerId)}
                            </p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                              {format(parseISO(b.deliveryDate), "MMM d")} · {b.deliveryTime}
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
              {bookings.filter(
                (b) => b.status !== "cancelled" && b.status !== "delivered" && totalDue(b) > 0,
              ).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Outstanding Payments
                  </h4>
                  <div className="space-y-1">
                    {bookings
                      .filter(
                        (b) =>
                          b.status !== "cancelled" && b.status !== "delivered" && totalDue(b) > 0,
                      )
                      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
                      .slice(0, 3)
                      .map((b) => (
                        <Link
                          key={b.id}
                          to="/bookings/$id"
                          params={{ id: b.id }}
                          onClick={() => setShowPopup(false)}
                          className="flex justify-between items-center p-2.5 rounded-xl bg-secondary/35 border border-border/15 hover:bg-secondary/65 transition cursor-pointer text-left animate-in slide-in-from-bottom-1"
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
          </div>
        </div>
      )}
      {/* Global Search Popup Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 z-50 bg-background flex flex-col pt-[calc(env(safe-area-inset-top,0px)+4px)] animate-in fade-in duration-200 text-left"
          onClick={(e) => e.stopPropagation()}
        >
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
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
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
                All ({getSearchResults().customers.length + getSearchResults().bookings.length + getSearchResults().payments.length})
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
                Customers ({getSearchResults().customers.length})
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
                Bookings ({getSearchResults().bookings.length})
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
                Payments ({getSearchResults().payments.length})
              </button>
            </div>
          )}

          {/* Results Area */}
          <div ref={resultsRef} className="px-4 py-4 overflow-y-auto flex-1 bg-background/30">
            {!searchQuery ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Type phone number, bill number, name or payments...
              </div>
            ) : (getSearchResults().customers.length + getSearchResults().bookings.length + getSearchResults().payments.length) === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No matches found for "{searchQuery}"
              </div>
            ) : (
              <div className="space-y-4 pb-20">
                {/* Category: Customers */}
                {(activeTab === "all" || activeTab === "customers") && getSearchResults().customers.length > 0 && (
                  <div>
                    {activeTab === "all" && (
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <User className="size-3 text-primary/80" /> Customers
                      </h4>
                    )}
                    <div className="space-y-2">
                      {getSearchResults().customers.map((c) => (
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
                {(activeTab === "all" || activeTab === "bookings") && getSearchResults().bookings.length > 0 && (
                  <div>
                    {activeTab === "all" && (
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 mt-2 flex items-center gap-1.5">
                        <Receipt className="size-3 text-primary/80" /> Bookings
                      </h4>
                    )}
                    <div className="space-y-2">
                      {getSearchResults().bookings.map((b) => {
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
                                Delivery: {format(parseISO(b.deliveryDate), "MMM d, yyyy")}
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
                {(activeTab === "all" || activeTab === "payments") && getSearchResults().payments.length > 0 && (
                  <div>
                    {activeTab === "all" && (
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 mt-2 flex items-center gap-1.5">
                        <IndianRupee className="size-3 text-primary/80" /> Payments
                      </h4>
                    )}
                    <div className="space-y-2">
                      {getSearchResults().payments.map((p) => {
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
                                Date: {format(parseISO(p.date), "MMM d, yyyy")}
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
      )}
    </div>
  );
}
