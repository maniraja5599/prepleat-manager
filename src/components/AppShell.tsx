import { useState, useEffect, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { useStore, totalDue, fmtINR } from "@/lib/store";
import logoAsset from "@/assets/eyas-logo.png";
import { CloudOff, RefreshCw, AlertCircle, Check, Calendar, Clock, Wallet, X, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** @deprecated brand strip now renders on every page automatically */
  showBrand?: boolean;
  wide?: boolean;
}

export function AppShell({ title, subtitle, children, wide }: Props) {
  const settings = useStore((s) => s.settings);
  const logo = settings.logoDataUrl || logoAsset;
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);

  const [sync, setSync] = useState(() => {
    if (typeof window !== "undefined" && (window as any).__syncStatus) {
      return (window as any).__syncStatus;
    }
    return { syncStatus: "synced", showStatus: false, errorMessage: "" };
  });

  const [showPopup, setShowPopup] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerItems, setTickerItems] = useState<Array<{ type: string; text: string; icon: string; color: string }>>([]);

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
        .filter(b => b.status !== "cancelled" && b.status !== "delivered" && format(parseISO(b.deliveryDate), "yyyy-MM-dd") >= todayStr)
        .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
      return upcoming[0];
    } catch {
      return null;
    }
  };

  const getCustomerName = (customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    return cust?.name || "Client";
  };

  useEffect(() => {
    const todayCount = bookings.filter(b => b.status !== "cancelled" && isToday(b.deliveryDate)).length;
    const nextB = getNextBooking();
    const dueCount = bookings.filter(b => b.status !== "cancelled" && b.status !== "delivered" && totalDue(b) > 0).length;

    const items = [];

    // 1. Connection / Sync item
    if (sync.syncStatus === "syncing") {
      items.push({ type: "sync", text: "Syncing...", icon: "syncing", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" });
    } else if (sync.syncStatus === "offline") {
      items.push({ type: "sync", text: "Offline Mode", icon: "offline", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" });
    } else if (sync.syncStatus === "error") {
      items.push({ type: "sync", text: "Sync Error", icon: "error", color: "text-red-500 bg-red-500/15 border-red-500/30" });
    } else {
      items.push({ type: "sync", text: "Cloud Synced", icon: "synced", color: "text-success bg-success/10 border-success/20" });
    }

    // 2. Today's Bookings
    if (todayCount > 0) {
      items.push({
        type: "today",
        text: `${todayCount} ${todayCount === 1 ? 'Booking' : 'Bookings'} Today`,
        icon: "calendar",
        color: "text-primary bg-primary/10 border-primary/20"
      });
    }

    // 3. Next Booking
    if (nextB) {
      const cust = customers.find(c => c.id === nextB.customerId);
      const timeStr = nextB.deliveryTime ? nextB.deliveryTime : "";
      items.push({
        type: "next",
        text: `Next: ${cust?.name || 'Client'} @ ${timeStr}`,
        icon: "clock",
        color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20"
      });
    }

    // 4. Due Payments
    if (dueCount > 0) {
      items.push({
        type: "due",
        text: `${dueCount} Pending Dues`,
        icon: "wallet",
        color: "text-rose-500 bg-rose-500/10 border-rose-500/20"
      });
    }

    setTickerItems(items);
  }, [bookings, sync, customers]);

  // Rotate ticker index
  useEffect(() => {
    if (tickerItems.length <= 1) {
      setTickerIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % tickerItems.length);
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
            <p className="text-[13px] font-display font-semibold tracking-tight truncate shrink-0">{settings.businessName}</p>
          </div>
          
          {/* Live Info Ticker (rendered in top-right slot) */}
          {tickerItems.length > 0 && (
            <button
              onClick={() => setShowPopup(true)}
              className={cn(
                "px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all duration-300 animate-in fade-in slide-in-from-right-2 cursor-pointer max-w-[140px] sm:max-w-none truncate hover:brightness-95 active:scale-95 shrink-0 ml-auto",
                tickerItems[tickerIndex]?.color
              )}
            >
              {tickerItems[tickerIndex]?.icon === "syncing" && <RefreshCw className="size-2.5 animate-spin" />}
              {tickerItems[tickerIndex]?.icon === "offline" && <CloudOff className="size-2.5" />}
              {tickerItems[tickerIndex]?.icon === "error" && <AlertCircle className="size-2.5 animate-shake-sm text-red-500" />}
              {tickerItems[tickerIndex]?.icon === "synced" && <Check className="size-2.5" />}
              {tickerItems[tickerIndex]?.icon === "calendar" && <Calendar className="size-2.5 text-primary" />}
              {tickerItems[tickerIndex]?.icon === "clock" && <Clock className="size-2.5 text-indigo-500" />}
              {tickerItems[tickerIndex]?.icon === "wallet" && <Wallet className="size-2.5 text-rose-500" />}
              <span className="truncate">{tickerItems[tickerIndex]?.text}</span>
            </button>
          )}

          {/* Fallback gold dot if ticker is empty */}
          {tickerItems.length === 0 && (
            <div className="ml-auto shrink-0 flex items-center">
              <span className="size-1.5 rounded-full bg-gold/60 animate-in fade-in duration-300" aria-hidden />
            </div>
          )}
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
          <header className="px-5 pt-2 pb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-display font-semibold tracking-tight truncate">{title}</h1>
              {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
            </div>
            {right}
          </header>
        )}
        <main className="px-5">{children}</main>
        <p className="text-center text-[10px] text-muted-foreground/70 mt-8 pb-2">
          Developed by{" "}
          <a href="https://www.instagram.com/maniraja__/" target="_blank" rel="noreferrer" className="font-semibold text-primary/80 hover:underline">ManiRaja</a>
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notification Hub</h3>
                <p className="text-[9px] text-muted-foreground mt-0.5">Real-time alerts and shortcuts</p>
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
              <div className={cn(
                "p-3 rounded-xl border flex flex-col gap-2 transition-all",
                sync.syncStatus === "synced" && "bg-[oklch(0.55_0.13_150)]/[0.04] border-[oklch(0.55_0.13_150)]/15 text-[oklch(0.55_0.13_150)]",
                sync.syncStatus === "syncing" && "bg-blue-500/[0.04] border-blue-500/15 text-blue-500",
                sync.syncStatus === "offline" && "bg-amber-500/[0.04] border-amber-500/15 text-amber-500",
                sync.syncStatus === "error" && "bg-red-500/[0.04] border-red-500/20 text-red-500"
              )}>
                <div className="flex items-center gap-2">
                  {sync.syncStatus === "syncing" && <RefreshCw className="size-4 animate-spin" />}
                  {sync.syncStatus === "offline" && <CloudOff className="size-4 animate-bounce-slow" />}
                  {sync.syncStatus === "error" && <AlertTriangle className="size-4 animate-shake-sm" />}
                  {sync.syncStatus === "synced" && <Check className="size-4 stroke-[3]" />}
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {sync.syncStatus === "synced" && "Database Synced"}
                    {sync.syncStatus === "syncing" && "Syncing Data..."}
                    {sync.syncStatus === "offline" && "Offline Mode Active"}
                    {sync.syncStatus === "error" && "Database Sync Error"}
                  </span>
                </div>
                
                <p className="text-[10px] text-muted-foreground/90 leading-normal">
                  {sync.syncStatus === "synced" && "All records are fully updated and saved securely to the cloud."}
                  {sync.syncStatus === "syncing" && "We are uploading your changes and pulling the latest updates."}
                  {sync.syncStatus === "offline" && "No connection. You can keep editing; changes will auto-sync when online."}
                  {sync.syncStatus === "error" && "Failed to connect to the cloud database. Tap retry to reconnect."}
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
              {bookings.filter(b => b.status !== "cancelled" && isToday(b.deliveryDate)).length > 0 ? (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Today's Bookings</h4>
                  <div className="space-y-1">
                    {bookings.filter(b => b.status !== "cancelled" && isToday(b.deliveryDate)).map(b => (
                      <Link
                        key={b.id}
                        to={`/bookings/${b.id}`}
                        onClick={() => setShowPopup(false)}
                        className="flex justify-between items-center p-2.5 rounded-xl bg-secondary/35 border border-border/15 hover:bg-secondary/65 transition cursor-pointer text-left animate-in slide-in-from-bottom-1"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold truncate">{getCustomerName(b.customerId)}</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                            {b.service} · {b.sareeCount} {b.sareeCount === 1 ? "Saree" : "Sarees"}
                          </p>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-1.5">
                          <div>
                            <p className="text-[10px] font-bold">{b.deliveryTime}</p>
                            <p className="text-[9px] text-success font-semibold">{fmtINR(b.totalAmount)}</p>
                          </div>
                          <ChevronRight className="size-3 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-secondary/15 rounded-xl border border-border/10 text-center">
                  <p className="text-[10px] text-muted-foreground/80">No bookings scheduled for today.</p>
                </div>
              )}

              {/* Next Upcoming Booking */}
              {bookings.filter(b => b.status !== "cancelled" && b.status !== "delivered" && !isToday(b.deliveryDate) && new Date(b.deliveryDate) >= new Date()).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Next Upcoming Bookings</h4>
                  <div className="space-y-1">
                    {bookings
                      .filter(b => b.status !== "cancelled" && b.status !== "delivered" && !isToday(b.deliveryDate) && new Date(b.deliveryDate) >= new Date())
                      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
                      .slice(0, 3)
                      .map(b => (
                        <Link
                          key={b.id}
                          to={`/bookings/${b.id}`}
                          onClick={() => setShowPopup(false)}
                          className="flex justify-between items-center p-2.5 rounded-xl bg-secondary/35 border border-border/15 hover:bg-secondary/65 transition cursor-pointer text-left animate-in slide-in-from-bottom-1"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold truncate">{getCustomerName(b.customerId)}</p>
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
              {bookings.filter(b => b.status !== "cancelled" && b.status !== "delivered" && totalDue(b) > 0).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Outstanding Payments</h4>
                  <div className="space-y-1">
                    {bookings
                      .filter(b => b.status !== "cancelled" && b.status !== "delivered" && totalDue(b) > 0)
                      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
                      .slice(0, 3)
                      .map(b => (
                        <Link
                          key={b.id}
                          to={`/bookings/${b.id}`}
                          onClick={() => setShowPopup(false)}
                          className="flex justify-between items-center p-2.5 rounded-xl bg-secondary/35 border border-border/15 hover:bg-secondary/65 transition cursor-pointer text-left animate-in slide-in-from-bottom-1"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold truncate">{getCustomerName(b.customerId)}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                              Total: {fmtINR(b.totalAmount)}
                            </p>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-1.5">
                            <div>
                              <p className="text-[10px] font-bold text-destructive">{fmtINR(totalDue(b))} due</p>
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
    </div>
  );
}
