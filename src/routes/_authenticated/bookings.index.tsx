import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, totalDue, netBookingAmount, formatShortBillNumber, fmtINR, fmtTime12, formatAppDate, type ServiceType } from "@/lib/store";
import { useState, useMemo, useEffect, useRef } from "react";
import { cn, cleanPhoneForDialing, cleanPhoneForWhatsApp } from "@/lib/utils";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  Search,
  IndianRupee,
  SlidersHorizontal,
  X as XIcon,
  History,
  CheckSquare,
  Trash2,
  Calendar,
  ArrowUpDown,
  Filter,
  Sparkles,
  Wallet,
  Layers,
  Clock,
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  Phone,
  MessageCircle,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { BookingRequestsInbox } from "@/components/BookingRequestsInbox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/bookings/")({
  validateSearch: (search: Record<string, unknown>): { past?: boolean } => {
    return {
      past: search.past === true || search.past === "true" || undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Bookings — Eyas Saree Drapist" },
      {
        name: "description",
        content: "All your PrePleat and Drape bookings, sortable and filterable.",
      },
    ],
  }),
  component: BookingsPage,
});

type SvcFilter = "all" | ServiceType;
type PayFilter = "all" | "paid" | "due";
type Sort = "delivery" | "recent" | "due" | "bill";
type Range = "all" | "thisMonth" | "lastMonth" | "custom";

const MONTH_THEMES = [
  {
    bg: "bg-primary/[0.04]",
    border: "border-primary/25",
    badge: "saree-gradient text-white shadow-xs",
    dot: "bg-primary text-primary",
    dotPing: "bg-primary",
  },
  {
    bg: "bg-[oklch(0.55_0.13_150)]/[0.04]",
    border: "border-[oklch(0.55_0.13_150)]/25",
    badge: "bg-[oklch(0.55_0.13_150)] text-white shadow-xs",
    dot: "bg-[oklch(0.55_0.13_150)] text-[oklch(0.55_0.13_150)]",
    dotPing: "bg-[oklch(0.55_0.13_150)]",
  },
  {
    bg: "bg-[oklch(0.78_0.13_75)]/[0.05]",
    border: "border-[oklch(0.78_0.13_75)]/30",
    badge: "bg-[oklch(0.78_0.13_75)] text-white shadow-xs",
    dot: "bg-[oklch(0.78_0.13_75)] text-[oklch(0.78_0.13_75)]",
    dotPing: "bg-[oklch(0.78_0.13_75)]",
  },
  {
    bg: "bg-indigo-500/[0.04]",
    border: "border-indigo-500/25",
    badge: "bg-indigo-600 text-white shadow-xs",
    dot: "bg-indigo-500 text-indigo-500",
    dotPing: "bg-indigo-500",
  },
];

function BookingsPage() {
  const { past } = Route.useSearch();
  const navigate = useNavigate();
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const updateBooking = useStore((s) => s.updateBooking);
  const deleteBooking = useStore((s) => s.deleteBooking);
  const restoreBooking = useStore((s) => s.restoreBooking);
  const addPayment = useStore((s) => s.addPayment);
  const settings = useStore((s) => s.settings);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mainFilter, setMainFilter] = useState<
    "active" | "prepleat" | "drape" | "artist" | "history"
  >("active");
  const [showPast, setShowPast] = useState(past || false);
  const [pay, setPay] = useState<PayFilter>("all");
  const [sort, setSort] = useState<Sort>("delivery");
  const [q, setQ] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Sync showPast with the query parameter
  useEffect(() => {
    if (past !== undefined) {
      setShowPast(past);
      if (past) {
        setMainFilter("active");
      }
    }
  }, [past]);

  // Pending complete warning (payment check before completing)
  const [pendingComplete, setPendingComplete] = useState<{ id: string; due: number; name: string } | null>(null);
  const [pendingCollectType, setPendingCollectType] = useState<"full" | "custom" | "none">("full");
  const [pendingCustomAmount, setPendingCustomAmount] = useState("");
  const [pendingPayMode, setPendingPayMode] = useState<string>(settings.defaultPaymentMode ?? "gpay");
  const [pendingSendDeliveryWA, setPendingSendDeliveryWA] = useState(true);
  const [completedDeliveryPreview, setCompletedDeliveryPreview] = useState<{
    customerName: string;
    phone?: string;
    phoneWA?: string;
    waText: string;
    billNo: string;
    sareeCount: number;
    netTotal: number;
    totalPaidAfter: number;
    remainingDueAfter: number;
  } | null>(null);

  // Ticker Index and interval for scrolling stats ticker in header and month cards
  const [tickerIndex, setTickerIndex] = useState(0);
  const [monthTickerIndex, setMonthTickerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % 2);
      setMonthTickerIndex((prev) => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const activeFiltersCount =
    (pay !== "all" ? 1 : 0) + (range !== "all" ? 1 : 0) + (sort !== "delivery" ? 1 : 0);

  const getPaymentLabel = (p: PayFilter) =>
    p === "all" ? "All Payments" : p === "due" ? "Due" : "Paid";
  const paymentSummary = getPaymentLabel(pay);

  const getDateSummary = () => {
    if (range === "all") return "All Time";
    if (range === "thisMonth") return "This Month";
    if (range === "lastMonth") return "Last Month";
    if (range === "custom") {
      if (from && to) {
        try {
          return `${format(parseISO(from), "dd/MM")} - ${format(parseISO(to), "dd/MM")}`;
        } catch {
          return "Custom Range";
        }
      }
      if (from) {
        try {
          return `From ${format(parseISO(from), "dd/MM")}`;
        } catch {
          return "Custom Range";
        }
      }
      if (to) {
        try {
          return `Until ${format(parseISO(to), "dd/MM")}`;
        } catch {
          return "Custom Range";
        }
      }
      return "Custom Range";
    }
    return "All Time";
  };

  const getSortLabel = (s: Sort) =>
    s === "delivery" ? "Delivery Date" : s === "recent" ? "Recently Booked" : s === "bill" ? "Bill Number" : "Balance Due";
  const sortingSummary = `Sorted by ${getSortLabel(sort)}`;

  const dateBounds = useMemo<{ start?: Date; end?: Date }>(() => {
    const now = new Date();
    if (range === "thisMonth") return { start: startOfMonth(now), end: endOfMonth(now) };
    if (range === "lastMonth") {
      const lm = subMonths(now, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm) };
    }
    if (range === "custom") {
      return {
        start: from ? new Date(from + "T00:00:00") : undefined,
        end: to ? new Date(to + "T23:59:59") : undefined,
      };
    }
    return {};
  }, [range, from, to]);

  const list = useMemo(() => {
    let arr = bookings.slice();

    // Filter by status (active vs past)
    // Past = completed or delivered; Active = everything else
    if (showPast) {
      arr = arr.filter((b) => b.status === "completed" || b.status === "delivered");
    } else {
      arr = arr.filter((b) => b.status !== "completed" && b.status !== "delivered");
    }

    // Filter by service type (mainFilter)
    if (mainFilter === "prepleat") {
      arr = arr.filter((b) => b.service === "prepleat");
    } else if (mainFilter === "drape") {
      arr = arr.filter((b) => {
        const c = customers.find((x) => x.id === b.customerId);
        const isArtistBooking = !!b.artistId || c?.kind === "artist";
        return b.service === "drape" && !isArtistBooking;
      });
    } else if (mainFilter === "artist") {
      arr = arr.filter((b) => {
        const c = customers.find((x) => x.id === b.customerId);
        const isArtistBooking = !!b.artistId || c?.kind === "artist";
        return isArtistBooking;
      });
    }

    if (pay === "paid") arr = arr.filter((b) => totalDue(b) === 0);
    if (pay === "due") arr = arr.filter((b) => totalDue(b) > 0);
    if (dateBounds.start || dateBounds.end) {
      arr = arr.filter((b) => {
        const d = parseISO(b.deliveryDate);
        if (dateBounds.start && d < dateBounds.start) return false;
        if (dateBounds.end && d > dateBounds.end) return false;
        return true;
      });
    }
    if (q.trim()) {
      const ql = q.toLowerCase();
      arr = arr.filter((b) => {
        const c = customers.find((x) => x.id === b.customerId);
        return c?.name.toLowerCase().includes(ql) || c?.phone.includes(ql);
      });
    }
    arr.sort((a, b) => {
      if (sort === "bill") {
        const numA = parseInt((a.billNumber || "").replace(/\D/g, ""), 10) || 0;
        const numB = parseInt((b.billNumber || "").replace(/\D/g, ""), 10) || 0;
        return numB - numA;
      }
      if (sort === "delivery") {
        if (showPast) {
          return (
            b.deliveryDate.localeCompare(a.deliveryDate) ||
            b.deliveryTime.localeCompare(a.deliveryTime)
          );
        }
        return (
          a.deliveryDate.localeCompare(b.deliveryDate) ||
          a.deliveryTime.localeCompare(b.deliveryTime)
        );
      }
      if (sort === "recent") return b.createdAt.localeCompare(a.createdAt);
      return totalDue(b) - totalDue(a);
    });
    return arr;
  }, [bookings, mainFilter, showPast, pay, sort, q, customers, dateBounds]);

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, { monthKey: string; monthLabel: string; items: typeof list }>();

    for (const b of list) {
      let monthKey = "Unknown";
      let monthLabel = "Other";
      try {
        const d = parseISO(b.deliveryDate);
        monthKey = format(d, "yyyy-MM");
        monthLabel = format(d, "MMMM yyyy");
      } catch {}

      if (!map.has(monthKey)) {
        map.set(monthKey, { monthKey, monthLabel, items: [] });
      }
      map.get(monthKey)!.items.push(b);
    }

    return Array.from(map.values());
  }, [list]);

  const counts = useMemo(() => {
    // Active = not completed and not delivered
    const statusFilter = (b: any) =>
      showPast
        ? b.status === "completed" || b.status === "delivered"
        : b.status !== "completed" && b.status !== "delivered";
    return {
      active: bookings.filter((b) => statusFilter(b)).length,

      prepleat: bookings.filter((b) => b.service === "prepleat" && statusFilter(b)).length,
      drape: bookings.filter((b) => {
        const c = customers.find((x) => x.id === b.customerId);
        const isArtistBooking = !!b.artistId || c?.kind === "artist";
        return b.service === "drape" && !isArtistBooking && statusFilter(b);
      }).length,
      artist: bookings.filter((b) => {
        const c = customers.find((x) => x.id === b.customerId);
        const isArtistBooking = !!b.artistId || c?.kind === "artist";
        return isArtistBooking && statusFilter(b);
      }).length,
      history: bookings.filter((b) => b.status === "delivered" || b.status === "completed").length,
    };
  }, [bookings, customers, showPast]);

  const collected = list.reduce((s, b) => s + b.advancePaid, 0);
  const pending = list.reduce((s, b) => s + totalDue(b), 0);

  const tickerItems = useMemo(() => {
    return [
      { label: "Collected", value: collected, color: "text-success" },
      {
        label: "Pending",
        value: pending,
        color: pending > 0 ? "text-destructive" : "text-muted-foreground",
      },
    ];
  }, [collected, pending]);

  return (
    <AppShell showFloatingSearch={true}>
      {/* Sticky Header block (Title + Ticker + Primary Switcher + Tab Bar) */}
      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-20 bg-background/95 backdrop-blur-md -mx-5 px-5 pt-3 pb-2.5 border-b border-border/40 mb-4">
        <div className="flex items-center justify-between gap-4 h-9">
          <div>
            <h1 className="text-xl font-display font-semibold tracking-tight text-foreground">
              Bookings
            </h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {showPast ? `${counts.history} Completed Orders` : `${counts.active} Active Orders`}
            </p>
          </div>

          {/* Scrolling Stats Ticker */}
          <div className="h-7 overflow-hidden relative min-w-[110px]">
            <div
              className="transition-transform duration-500 ease-in-out"
              style={{ transform: `translateY(-${tickerIndex * 28}px)` }}
            >
              {tickerItems.map((item, idx) => (
                <div key={idx} className="h-7 flex flex-col items-end justify-center">
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-extrabold leading-none">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-extrabold tabular-nums mt-0.5 leading-none",
                      item.color,
                    )}
                  >
                    {fmtINR(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Primary View Toggle: Active Bookings vs Past / History */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-secondary/60 rounded-2xl mt-3 mb-2 border border-border/20">
          <button
            type="button"
            onClick={() => {
              setShowPast(false);
              setMainFilter("active");
              navigate({ to: "/bookings", search: { past: undefined }, replace: true });
            }}
            className={cn(
              "py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              !showPast
                ? "bg-card text-foreground shadow-sm border border-border/40"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>🟢 Active Bookings</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-extrabold">
              {bookings.filter((b) => b.status !== "completed" && b.status !== "delivered").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowPast(true);
              setMainFilter("active");
              navigate({ to: "/bookings", search: { past: true }, replace: true });
            }}
            className={cn(
              "py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
              showPast
                ? "bg-card text-foreground shadow-sm border border-border/40"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-1">
              <History className="size-3.5" /> Past / History
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground font-extrabold">
              {counts.history}
            </span>
          </button>
        </div>

        {/* Horizontal Scrollable Filter Row */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar items-center pb-0.5">
          {[
            { id: "active" as const, label: showPast ? "All Past" : "All Active", count: counts.active },
            { id: "prepleat" as const, label: "PrePleat", count: counts.prepleat },
            { id: "drape" as const, label: "Direct Drape", count: counts.drape },
            { id: "artist" as const, label: "Artist", count: counts.artist },
          ].map((item) => {
            const isActive = mainFilter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setMainFilter(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1 text-[11px] font-semibold tracking-wide border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95",
                  isActive
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                )}
              >
                <span>{item.label}</span>
                <span
                  className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-bold tabular-nums",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex gap-1.5 mb-3 items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {list.length} {showPast ? "past" : "active"} orders matched
        </span>

        <div className="flex gap-1.5 items-center">
          {!selectMode && (
            <Link
              to="/"
              search={{ guide: "book" }}
              className="rounded-full px-3 py-1.5 bg-card border border-border text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition cursor-pointer active:scale-95 hover:bg-secondary/40 hover:text-foreground"
            >
              <Calendar className="size-3.5" /> Book
            </Link>
          )}

          <button
            onClick={() => {
              setSelectMode((v) => !v);
              setSelected(new Set());
            }}
            className={cn(
              "rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition cursor-pointer active:scale-95",
              selectMode
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground",
            )}
          >
            <CheckSquare className="size-3.5" /> {selectMode ? "Done" : "Select"}
          </button>
        </div>
      </div>

      {selectMode && (
        <div className="bg-card card-shadow rounded-2xl p-2 mb-3 flex items-center gap-2">
          <button
            onClick={() => {
              if (selected.size === list.length) setSelected(new Set());
              else setSelected(new Set(list.map((b) => b.id)));
            }}
            className="px-3 py-1.5 rounded-full bg-secondary text-xs font-semibold"
          >
            {selected.size === list.length && list.length > 0 ? "Clear all" : "Select all"}
          </button>
          <span className="text-xs text-muted-foreground flex-1">{selected.size} selected</span>
          <button
            disabled={selected.size === 0}
            onClick={() => setConfirmOpen(true)}
            className="px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
          >
            <Trash2 className="size-3.5" /> Delete {selected.size || ""}
          </button>
        </div>
      )}

      <BookingRequestsInbox />

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer or phone"
            className="w-full bg-card border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button
              className={cn(
                "shrink-0 size-11 rounded-full flex items-center justify-center relative transition border cursor-pointer border-border",
                activeFiltersCount > 0
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground",
              )}
              aria-label="Filter bookings"
            >
              <SlidersHorizontal className="size-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-[10px] text-white font-bold flex items-center justify-center ring-2 ring-background">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 pt-10 pb-8"
          >
            <SheetHeader className="mb-3 border-b border-border/40 pb-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="size-4.5 text-primary" />
                  <SheetTitle className="text-base font-semibold">
                    Filter & Sort Bookings
                  </SheetTitle>
                </div>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setPay("all");
                      setRange("all");
                      setSort("delivery");
                      setFrom("");
                      setTo("");
                      toast.success("All filters cleared", { duration: 1200 });
                    }}
                    className="text-xs font-semibold text-destructive flex items-center gap-1 active:scale-95 transition bg-destructive/10 px-2.5 py-1 rounded-full cursor-pointer animate-in fade-in zoom-in-95 duration-150"
                  >
                    <XIcon className="size-3" /> Clear all
                  </button>
                )}
              </div>
            </SheetHeader>

            <Accordion type="multiple" defaultValue={["pay-status"]} className="w-full">
              {/* Category 1: Payment Status */}
              <AccordionItem value="pay-status" className="border-b border-border/40 py-1">
                <AccordionTrigger className="hover:no-underline py-3 cursor-pointer">
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <Wallet className="size-4 text-primary" /> Payment Status
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      {paymentSummary}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  {/* Payment Status */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold pl-1">
                      Payment Status
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "all" as const, label: "All Payments", icon: Wallet },
                        { id: "due" as const, label: "Balance Due", icon: AlertCircle },
                        { id: "paid" as const, label: "Fully Paid", icon: CheckCircle2 },
                      ].map((item) => {
                        const active = pay === item.id;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setPay(item.id)}
                            className={cn(
                              "flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border text-center transition active:scale-95 cursor-pointer",
                              active
                                ? item.id === "due"
                                  ? "bg-destructive/10 border-destructive/80 text-destructive font-bold shadow-sm"
                                  : item.id === "paid"
                                    ? "bg-success/15 border-success/80 text-success-foreground font-bold shadow-sm"
                                    : "bg-primary/10 border-primary text-primary font-bold shadow-sm"
                                : "bg-card border-border hover:bg-secondary/40 text-muted-foreground",
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-4 mb-1",
                                active ? "" : "text-muted-foreground/85",
                              )}
                            />
                            <span className="text-[11px] font-semibold">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Category 2: Date & Time */}
              <AccordionItem value="date-range" className="border-b border-border/40 py-1">
                <AccordionTrigger className="hover:no-underline py-3 cursor-pointer">
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <Calendar className="size-4 text-primary" /> Delivery Date
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      {getDateSummary()}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "all" as Range, label: "All Time" },
                      { id: "thisMonth" as Range, label: "This Month" },
                      { id: "lastMonth" as Range, label: "Last Month" },
                      { id: "custom" as Range, label: "Custom Range" },
                    ].map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setRange(r.id)}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-xs font-semibold text-center transition active:scale-95 cursor-pointer border",
                          range === r.id
                            ? "bg-primary border-primary text-primary-foreground shadow-sm"
                            : "bg-secondary/60 border-transparent text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {range === "custom" && (
                    <div className="grid grid-cols-2 gap-3 mt-1 bg-secondary/30 p-3 rounded-2xl border border-border/40 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold pl-1">
                          From
                        </span>
                        <input
                          type="date"
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                          className="bg-card rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary w-full cursor-pointer"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold pl-1">
                          To
                        </span>
                        <input
                          type="date"
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                          className="bg-card rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary w-full cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Category 3: Sorting */}
              <AccordionItem value="sorting" className="border-b-0 py-1">
                <AccordionTrigger className="hover:no-underline py-3 cursor-pointer">
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <ArrowUpDown className="size-4 text-primary" /> Sort Preference
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      {sortingSummary}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-3">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold pl-1">
                      Sort By
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "delivery" as Sort, label: "Delivery Date" },
                        { id: "recent" as Sort, label: "Recently Booked" },
                        { id: "bill" as Sort, label: "Bill Number (#)" },
                        { id: "due" as Sort, label: "Balance Due" },
                      ].map((sOpt) => (
                        <button
                          key={sOpt.id}
                          onClick={() => setSort(sOpt.id)}
                          className={cn(
                            "py-2 px-1.5 rounded-xl text-[11px] font-semibold text-center transition active:scale-95 cursor-pointer border leading-tight flex items-center justify-center h-10",
                            sort === sOpt.id
                              ? "bg-primary border-primary text-primary-foreground shadow-sm"
                              : "bg-secondary/60 border-transparent text-muted-foreground hover:bg-secondary/80",
                          )}
                        >
                          {sOpt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </SheetContent>
        </Sheet>
      </div>

      {/* Removed duplicate tabs */}

      {list.length === 0 ? (
        <div className="bg-card card-shadow rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No {showPast ? "past" : "active"} bookings match. Tap <span className="font-semibold text-primary">+</span> to create one.
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-7 space-y-6 before:absolute before:left-2.5 sm:before:left-3 before:top-4 before:bottom-4 before:w-[2px] before:bg-gradient-to-b before:from-primary/50 before:via-border before:to-border/20">
          {groupedByMonth.map((group, gIdx) => {
            const theme = MONTH_THEMES[gIdx % MONTH_THEMES.length];
            const monthTotal = group.items.reduce((s, b) => s + netBookingAmount(b), 0);
            const monthSarees = group.items.reduce((s, b) => s + (b.sareeCount || 1), 0);
            const monthDue = group.items.reduce((s, b) => s + totalDue(b), 0);

            const tickerSlides = [
              {
                text: `${group.items.length} ${group.items.length === 1 ? "Order" : "Orders"} · ${monthSarees} Sarees`,
                color: "text-foreground font-semibold",
                icon: "📦",
              },
              {
                text: `${fmtINR(monthTotal)} Total Billed`,
                color: "text-primary font-bold",
                icon: "💰",
              },
              {
                text: monthDue > 0 ? `${fmtINR(monthDue)} Due Pending` : "100% Fully Paid ✨",
                color: monthDue > 0 ? "text-destructive font-bold" : "text-success font-bold",
                icon: monthDue > 0 ? "⚠️" : "✓",
              },
            ];

            return (
              <div key={group.monthKey} className="relative">
                {/* Timeline Milestone Node Pin */}
                <div
                  className={cn(
                    "absolute -left-6 sm:-left-7 top-3.5 size-3.5 rounded-full border-2 border-background shadow-xs flex items-center justify-center -translate-x-[2px] z-10",
                    theme.dot,
                  )}
                >
                  <span className={cn("size-1.5 rounded-full animate-ping opacity-75", theme.dotPing)} />
                </div>

                {/* Month Container Box */}
                <section
                  className={cn(
                    "border rounded-3xl p-3 sm:p-4 space-y-3 shadow-xs transition-all",
                    theme.bg,
                    theme.border,
                  )}
                >
                  {/* Month Section Header with Highlighted Pill + Animated Scrolling Stats Ticker */}
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    {/* Month Highlighted Badge Pill */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "px-3 py-1 rounded-xl text-xs font-display font-extrabold tracking-wide flex items-center gap-1.5",
                          theme.badge,
                        )}
                      >
                        <Calendar className="size-3.5" />
                        <span>{group.monthLabel}</span>
                      </span>
                    </div>

                    {/* Scrolling Detail Ticker */}
                    <div className="h-6 overflow-hidden relative flex-1 min-w-0 max-w-[200px] text-right">
                      <div
                        className="transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateY(-${monthTickerIndex * 24}px)` }}
                      >
                        {tickerSlides.map((slide, sIdx) => (
                          <div key={sIdx} className="h-6 flex items-center justify-end gap-1.5 text-[11px] truncate">
                            <span className="text-[10px] select-none">{slide.icon}</span>
                            <span className={cn("truncate", slide.color)}>{slide.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Month's Cards */}
                  <ul className="space-y-2">
                    {group.items.map((b) => {
                      const c = customers.find((x) => x.id === b.customerId);
                      const a = b.artistId ? customers.find((x) => x.id === b.artistId) : undefined;
                      const due = totalDue(b);
                      const isArtistBooking = !!b.artistId || c?.kind === "artist";
                      const tagColor =
                        b.service === "prepleat"
                          ? (settings.prepleatDotColor ?? "#ffa029")
                          : (settings.directDrapeDotColor ?? "#10b981");
                      const isSelected = selected.has(b.id);
                      const inner = (
                        <>
                          {isArtistBooking && (
                            <span className="absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-bl-xl bg-gold text-white">
                              ★ Artist
                            </span>
                          )}
                          {!isArtistBooking && b.service === "drape" && (
                            <span className="absolute bottom-0 right-0 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-tl-xl bg-[oklch(0.55_0.13_150)] text-white z-10">
                              Direct Drape
                            </span>
                          )}
                          {selectMode && (
                            <input
                              type="checkbox"
                              readOnly
                              checked={isSelected}
                              className="absolute top-2 left-2 size-5 accent-primary z-10"
                            />
                          )}
                          <div
                            className={cn(
                              "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3",
                              selectMode && "pl-7",
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <span className="font-semibold text-sm truncate max-w-[120px] sm:max-w-none">
                                  {c?.name ?? "Unknown"}
                                </span>
                                {c?.phone && (
                                  <span
                                    className="inline-flex gap-1.5 items-center shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <a
                                      href={`tel:${cleanPhoneForDialing(c.phone)}`}
                                      className="size-6 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition active:scale-90"
                                      title="Call Customer"
                                    >
                                      <Phone className="size-3 text-muted-foreground" />
                                    </a>
                                    <a
                                      href={`https://wa.me/${cleanPhoneForWhatsApp(c.phone)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="size-6 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition active:scale-90"
                                      title="WhatsApp Chat"
                                    >
                                      <MessageCircle className="size-3 text-muted-foreground" />
                                    </a>
                                  </span>
                                )}
                                <span
                                  style={{ backgroundColor: tagColor }}
                                  className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white shrink-0"
                                >
                                  {b.service === "prepleat" ? "PRE" : b.service}
                                </span>
                                {(b.billNumber || b.id) && (
                                  <span className="text-[8px] font-mono font-bold text-muted-foreground/80 shrink-0 bg-secondary/80 px-1.5 py-0.5 rounded">
                                    {formatShortBillNumber(b.billNumber, b.id)}
                                  </span>
                                )}
                                {b.status === "delivered" && (
                                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                    Delivered
                                  </span>
                                )}
                                {b.status === "cancelled" && (
                                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive/15 text-destructive shrink-0">
                                    Cancelled
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span>
                                  {formatAppDate(b.deliveryDate)} · {fmtTime12(b.deliveryTime)} · {b.sareeCount} saree{b.sareeCount > 1 && "s"}
                                </span>
                                {b.createdAt && (
                                  <span className="text-[9px] font-mono text-muted-foreground/75 bg-secondary/80 px-1.5 py-0.5 rounded shrink-0">
                                    Booked {formatAppDate(b.createdAt)}
                                  </span>
                                )}
                              </div>
                              {a && (
                                <p className="text-[10px] text-gold font-semibold mt-0.5 truncate">
                                  via {a.name}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0 pt-1">
                              <p className="text-sm font-semibold tabular-nums">{fmtINR(netBookingAmount(b))}</p>
                              {due > 0 ? (
                                <p className="text-xs text-destructive font-semibold flex items-center justify-end">
                                  <IndianRupee className="size-3" />
                                  {Math.round(due).toLocaleString("en-IN")} due
                                </p>
                              ) : (
                                <p className="text-xs text-success font-semibold">Paid</p>
                              )}
                            </div>
                          </div>
                        </>
                      );
                      const cardCls = cn(
                        "block bg-card card-shadow rounded-2xl p-4 active:scale-[0.99] transition relative overflow-hidden text-left w-full border-l-4",
                        isArtistBooking
                          ? "border-gold bg-gradient-to-br from-card to-gold/5 ring-1 ring-gold/30"
                          : b.service === "prepleat"
                            ? "border-[oklch(0.78_0.13_75)] bg-gradient-to-br from-card to-[oklch(0.92_0.08_75)]/5"
                            : "border-[oklch(0.55_0.13_150)] bg-gradient-to-br from-card to-[oklch(0.9_0.06_150)]/5 pb-6",
                        b.status === "cancelled" && "opacity-60",
                        isSelected && "ring-2 ring-primary",
                      );
                      return (
                        <li key={b.id} className="relative touch-pan-y">
                          {selectMode ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelected((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(b.id)) next.delete(b.id);
                                  else next.add(b.id);
                                  return next;
                                });
                              }}
                              className={cardCls}
                            >
                              {inner}
                            </button>
                          ) : (
                            <Link to="/bookings/$id" params={{ id: b.id }} className={cardCls}>
                              {inner}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PAYMENT PENDING COMPLETE WARNING MODAL ── */}
      {pendingComplete && (() => {
        const fullPayable = pendingComplete.due;
        const collectedNow =
          pendingCollectType === "full"
            ? fullPayable
            : pendingCollectType === "custom"
            ? Math.min(fullPayable, Math.max(0, Number(pendingCustomAmount) || 0))
            : 0;
        const remainingDueAfter = Math.max(0, fullPayable - collectedNow);

        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
            <div className="bg-card rounded-3xl p-6 w-full max-w-sm border border-border shadow-2xl animate-in zoom-in-95 fade-in duration-200 space-y-4">
              <div className="flex flex-col items-center text-center">
                <div className="size-12 rounded-full bg-amber-500/15 flex items-center justify-center mb-2">
                  <AlertTriangle className="size-6 text-amber-500" />
                </div>
                <h2 className="text-base font-bold">Complete Booking & Payment</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground">{pendingComplete.name}</span> has a balance of:
                </p>
                <p className="text-2xl font-extrabold text-destructive my-1 tabular-nums">
                  {fmtINR(pendingComplete.due)}
                </p>
              </div>

              {/* Payment Collection Type Tabs */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Payment Collection Option
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-secondary/60 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPendingCollectType("full")}
                    className={cn(
                      "py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer flex flex-col items-center gap-0.5",
                      pendingCollectType === "full"
                        ? "bg-card text-foreground shadow-xs border border-border/40"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>Full Paid</span>
                    <span className="text-[9px] font-mono text-success font-semibold">{fmtINR(fullPayable)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingCollectType("custom")}
                    className={cn(
                      "py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer flex flex-col items-center gap-0.5",
                      pendingCollectType === "custom"
                        ? "bg-card text-foreground shadow-xs border border-border/40"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>Custom ₹</span>
                    <span className="text-[9px] font-mono text-primary font-semibold">Partial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingCollectType("none")}
                    className={cn(
                      "py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer flex flex-col items-center gap-0.5",
                      pendingCollectType === "none"
                        ? "bg-card text-foreground shadow-xs border border-border/40"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>No Payment</span>
                    <span className="text-[9px] font-mono text-destructive font-semibold">Keep Due</span>
                  </button>
                </div>
              </div>

              {/* Custom Amount Input if Partial */}
              {pendingCollectType === "custom" && (
                <div className="space-y-1 animate-in fade-in duration-150">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Enter Amount Received Now (₹)
                  </label>
                  <input
                    type="number"
                    placeholder={`Max: ${fullPayable}`}
                    value={pendingCustomAmount}
                    onChange={(e) => setPendingCustomAmount(e.target.value)}
                    className="w-full bg-secondary border border-primary/30 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold tabular-nums text-foreground"
                  />
                  {Number(pendingCustomAmount) > fullPayable && (
                    <div className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-xl flex items-center gap-1.5 animate-in shake duration-200 mt-1.5">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span>⚠️ Entered amount ({fmtINR(Number(pendingCustomAmount))}) exceeds payable due ({fmtINR(fullPayable)})</span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Mode (only if collecting payment > 0) */}
              {collectedNow > 0 && (
                <div className="space-y-1 animate-in fade-in duration-150">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Payment Mode ({fmtINR(collectedNow)})
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["gpay", "cash", "other"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPendingPayMode(m)}
                        className={cn(
                          "py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer active:scale-95",
                          pendingPayMode === m
                            ? "bg-primary text-primary-foreground font-bold"
                            : "bg-secondary hover:bg-secondary/80 text-muted-foreground",
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Outcome pill */}
              <div className={cn(
                "p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between",
                collectedNow > 0 && remainingDueAfter === 0
                  ? "bg-success/10 text-success border-success/20"
                  : remainingDueAfter > 0
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : "bg-secondary text-foreground border-border/20"
              )}>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Payment Recorded:</span>
                  <span className="font-bold">{fmtINR(collectedNow)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">Remaining Due:</span>
                  <span className={cn("font-bold", remainingDueAfter > 0 ? "text-destructive" : "text-success")}>
                    {remainingDueAfter > 0 ? fmtINR(remainingDueAfter) : "₹0 (Fully Paid)"}
                  </span>
                </div>
              </div>

              {/* Delivery Receipt WhatsApp Toggle */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageCircle className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight truncate">
                      Send Delivery Receipt on WhatsApp
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      Thank you & settlement receipt to customer
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingSendDeliveryWA(!pendingSendDeliveryWA)}
                  className={cn(
                    "w-9 h-5 rounded-full relative transition-colors duration-200 cursor-pointer shrink-0",
                    pendingSendDeliveryWA ? "bg-emerald-600" : "bg-muted-foreground/30"
                  )}
                  title={pendingSendDeliveryWA ? "Delivery receipt ON" : "Delivery receipt OFF"}
                >
                  <div
                    className={cn(
                      "size-3.5 rounded-full bg-white transition-transform duration-200 absolute top-0.75 left-0.75 shadow-sm",
                      pendingSendDeliveryWA && "translate-x-4"
                    )}
                  />
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPendingComplete(null);
                    setPendingCustomAmount("");
                    setPendingCollectType("full");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-xs font-bold uppercase tracking-wider border border-border cursor-pointer active:scale-95 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pendingCollectType === "custom" && (!pendingCustomAmount || Number(pendingCustomAmount) <= 0 || Number(pendingCustomAmount) > fullPayable)}
                  onClick={() => {
                    if (pendingCollectType === "custom") {
                      const num = Number(pendingCustomAmount);
                      if (!num || num <= 0) {
                        toast.error("Please enter a valid payment amount");
                        return;
                      }
                      if (num > fullPayable) {
                        toast.error(`Amount cannot exceed payable due of ${fmtINR(fullPayable)}`);
                        return;
                      }
                    }
                    const b = bookings.find((x) => x.id === pendingComplete.id);
                    if (b && collectedNow > 0) {
                      addPayment({
                        bookingId: b.id,
                        customerId: b.customerId,
                        amount: collectedNow,
                        date: new Date().toISOString(),
                        mode: pendingPayMode,
                        note: "On completion",
                      });
                    }
                    updateBooking(pendingComplete.id, { status: "completed", completedAt: new Date().toISOString() });
                    
                    const totalPaidAfter = (b ? (b.advancePaid || 0) : 0) + collectedNow;
                    const finalDueAfter = remainingDueAfter;

                    if (b && pendingSendDeliveryWA) {
                      const c = customers.find((x) => x.id === b.customerId);
                      const phoneRaw = c?.phone;
                      const phone = phoneRaw ? cleanPhoneForWhatsApp(phoneRaw) : "";
                      if (phone) {
                        const extraLine = b.extraCharges ? `• *Extra/Travel*: ${fmtINR(b.extraCharges)} (${b.extraChargesNote || "Travel"})` : "";
                        const discLine = b.discount ? `• *Discount*: -${fmtINR(b.discount)}` : "";

                        const msgLines = [
                          `🎊 *EYAS SAREE DRAPIST* 🎊`,
                          `_Order Delivered & Completed_ ✨`,
                          ``,
                          `Dear *${c?.name || "Customer"}* 🙏`,
                          `Your saree order is *ready & delivered*! ✅🥻`,
                          ``,
                          `🌟 *DELIVERY RECEIPT*`,
                          `• *Bill No*: #${billNo}`,
                          `• *Sarees*: ${b.sareeCount} saree${b.sareeCount > 1 ? "s" : ""} × ${fmtINR(b.pricePerSaree)}`,
                          extraLine,
                          discLine,
                          ``,
                          `💰 *SETTLEMENT BREAKDOWN*`,
                          `• *Total Bill*: ${fmtINR(netTotal)}`,
                          `• *Total Paid*: ${fmtINR(totalPaidAfter)}`,
                          finalDueAfter === 0
                            ? `• *Status*: ✅ *PAID IN FULL* 💯`
                            : `• *Balance Due*: *${fmtINR(finalDueAfter)}*`,
                          ``,
                          `💖 _We hope you love your perfect pleats!_`,
                          `📸 _Please share your saree drape photos with us!_`,
                          ``,
                          `✨ *Thank you for choosing Eyas!* 🙏`,
                        ].filter((l) => l !== "");

                        setCompletedDeliveryPreview({
                          customerName: c?.name || "Customer",
                          phone: phoneRaw,
                          phoneWA: phone,
                          waText: encodeURIComponent(msgLines.join("\n")),
                          billNo,
                          sareeCount: b.sareeCount,
                          netTotal,
                          totalPaidAfter,
                          remainingDueAfter: finalDueAfter,
                        });
                      }
                    }

                    toast.success(
                      collectedNow > 0 && remainingDueAfter === 0
                        ? "Paid & Marked as Completed! ✅"
                        : remainingDueAfter > 0
                        ? `Marked as Completed (₹${remainingDueAfter} balance due) 📋`
                        : "Marked as Completed! ✅"
                    );
                    setPendingComplete(null);
                    setPendingCustomAmount("");
                    setPendingCollectType("full");
                  }}
                  className="flex-1 py-3 px-2 rounded-xl saree-gradient text-white text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Check className="size-3.5" />
                  <span>
                    {collectedNow > 0 && remainingDueAfter === 0
                      ? `Collect ${fmtINR(collectedNow)} & Complete ✓`
                      : collectedNow > 0 && remainingDueAfter > 0
                      ? `Collect ${fmtINR(collectedNow)} & Complete (${fmtINR(remainingDueAfter)} Due)`
                      : remainingDueAfter > 0
                      ? `Complete (${fmtINR(remainingDueAfter)} Due) ✓`
                      : "Complete Booking ✓"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${selected.size} booking${selected.size > 1 ? "s" : ""}?`}
        description="Deleted bookings move to Recently Deleted (Settings → Data) for 7 days."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          const n = selected.size;
          const ids = Array.from(selected);
          ids.forEach((id) => deleteBooking(id));
          setSelected(new Set());
          setSelectMode(false);
          setConfirmOpen(false);
          toast.success(`${n} booking${n > 1 ? "s" : ""} deleted`, {
            action: {
              label: "Undo",
              onClick: () => {
                ids.forEach((id) => restoreBooking(id));
                toast.success("Bookings restored");
              },
            },
            duration: 6000,
          });
        }}
      />

      {/* Completion & Delivery Receipt WhatsApp Modal */}
      {completedDeliveryPreview && (
        <div
          className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setCompletedDeliveryPreview(null)}
        >
          <div
            className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 border border-border/40 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-1 pt-1">
              <div className="size-12 rounded-full bg-success/15 text-success mx-auto flex items-center justify-center">
                <CheckCircle className="size-6" />
              </div>
              <h3 className="font-display font-bold text-base text-foreground">
                Order Completed & Saved! 🎉
              </h3>
              <p className="text-xs text-muted-foreground">
                Final settlement ready for Bill #{completedDeliveryPreview.billNo}
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-secondary/40 rounded-2xl p-3.5 border border-border/30 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Customer:</span>
                <span className="font-bold text-foreground">{completedDeliveryPreview.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Total Bill:</span>
                <span className="font-bold text-foreground">{fmtINR(completedDeliveryPreview.netTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Total Paid:</span>
                <span className="font-bold text-success">{fmtINR(completedDeliveryPreview.totalPaidAfter)}</span>
              </div>
              <div className="border-t border-border/30 pt-1.5 flex justify-between items-center font-bold">
                <span>Settlement:</span>
                <span className={completedDeliveryPreview.remainingDueAfter === 0 ? "text-success" : "text-destructive"}>
                  {completedDeliveryPreview.remainingDueAfter === 0
                    ? "Paid in Full ✅"
                    : `Balance Due: ${fmtINR(completedDeliveryPreview.remainingDueAfter)}`}
                </span>
              </div>
            </div>

            {/* WhatsApp Message Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <MessageCircle className="size-3 text-emerald-500" /> WhatsApp Receipt Preview
                </span>
                {completedDeliveryPreview.phone && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {completedDeliveryPreview.phone}
                  </span>
                )}
              </div>
              <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-3 text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                {decodeURIComponent(completedDeliveryPreview.waText)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30">
              <button
                type="button"
                onClick={() => setCompletedDeliveryPreview(null)}
                className="py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase tracking-wider active:scale-95 transition cursor-pointer"
              >
                Done / Close
              </button>

              {completedDeliveryPreview.phoneWA ? (
                <a
                  href={`https://wa.me/${completedDeliveryPreview.phoneWA}?text=${completedDeliveryPreview.waText}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setCompletedDeliveryPreview(null)}
                  className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider active:scale-95 transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="size-4" />
                  <span>Send WhatsApp</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    toast.error("No phone number available for WhatsApp");
                    setCompletedDeliveryPreview(null);
                  }}
                  className="py-3 rounded-xl bg-secondary text-muted-foreground text-xs font-bold uppercase tracking-wider"
                >
                  No Phone
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "muted";
}) {
  const toneClass = {
    default: "bg-card text-foreground",
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <div
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 flex items-baseline gap-1.5 card-shadow",
        toneClass,
      )}
    >
      <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-xs font-bold tabular-nums">{value}</span>
    </div>
  );
}


