import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, totalDue, fmtINR, fmtTime12, formatAppDate, type ServiceType } from "@/lib/store";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
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
  AlertCircle,
  Phone,
  MessageCircle,
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
type Sort = "delivery" | "recent" | "due";
type Range = "all" | "thisMonth" | "lastMonth" | "custom";

function BookingsPage() {
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const deleteBooking = useStore((s) => s.deleteBooking);
  const restoreBooking = useStore((s) => s.restoreBooking);
  const settings = useStore((s) => s.settings);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mainFilter, setMainFilter] = useState<
    "active" | "prepleat" | "drape" | "artist" | "history"
  >("active");
  const [showPast, setShowPast] = useState(false);
  const [pay, setPay] = useState<PayFilter>("all");
  const [sort, setSort] = useState<Sort>("delivery");
  const [q, setQ] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Ticker Index and interval for scrolling stats ticker in header
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % 2);
    }, 3000);
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
    s === "delivery" ? "Delivery Date" : s === "recent" ? "Recently Booked" : "Balance Due";
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

    // Filter by status (active vs past) based on showPast
    if (showPast) {
      arr = arr.filter((b) => b.status === "delivered");
    } else {
      arr = arr.filter((b) => b.status !== "delivered");
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
      if (sort === "delivery")
        return (
          a.deliveryDate.localeCompare(b.deliveryDate) ||
          a.deliveryTime.localeCompare(b.deliveryTime)
        );
      if (sort === "recent") return b.createdAt.localeCompare(a.createdAt);
      return totalDue(b) - totalDue(a);
    });
    return arr;
  }, [bookings, mainFilter, showPast, pay, sort, q, customers, dateBounds]);

  const counts = useMemo(() => {
    const statusFilter = (b: any) =>
      showPast ? b.status === "delivered" : b.status !== "delivered";
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
      history: bookings.filter((b) => b.status === "delivered").length,
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
      {/* Sticky Header block (Title + Ticker + Tab Bar) */}
      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-20 bg-background/95 backdrop-blur-md -mx-5 px-5 pt-3 pb-2.5 border-b border-border/40 mb-4">
        <div className="flex items-center justify-between gap-4 h-9">
          <div>
            <h1 className="text-xl font-display font-semibold tracking-tight text-foreground">
              Bookings
            </h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {counts.active} active · {counts.history} completed
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

        {/* Horizontal Scrollable Filter Row */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar items-center pb-0.5">
          {[
            { id: "active" as const, label: showPast ? "All" : "Active", count: counts.active },
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
                  "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-wide border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95",
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
          {list.length} matched
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

          {!selectMode && (
            <button
              onClick={() => {
                setShowPast((prev) => !prev);
                setMainFilter("active");
              }}
              className={cn(
                "rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition cursor-pointer active:scale-95",
                showPast
                  ? "bg-primary text-primary-foreground border border-primary shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
              )}
            >
              <History className="size-3.5" /> Past
              <span
                className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-bold tabular-nums",
                  showPast
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {counts.history}
              </span>
            </button>
          )}
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
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "delivery" as Sort, label: "Delivery Date" },
                        { id: "recent" as Sort, label: "Recently Booked" },
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
          No bookings match. Tap <span className="font-semibold text-primary">+</span> to create
          one.
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((b) => {
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
                            href={`tel:${c.phone.replace(/\D/g, "")}`}
                            className="size-6 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition active:scale-90"
                            title="Call Customer"
                          >
                            <Phone className="size-3 text-muted-foreground" />
                          </a>
                          <a
                            href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
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
                      {b.billNumber && (
                        <span className="text-[8px] font-mono text-muted-foreground/70 shrink-0 bg-secondary/80 px-1 py-0.5 rounded">
                          #{b.billNumber.split("-").pop()}
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
                    <p className="text-xs text-muted-foreground truncate">
                      {formatAppDate(b.deliveryDate)} · {fmtTime12(b.deliveryTime)}{" "}
                      · {b.sareeCount} saree{b.sareeCount > 1 && "s"}
                    </p>
                    {a && (
                      <p className="text-[10px] text-gold font-semibold mt-0.5 truncate">
                        via {a.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 pt-1">
                    <p className="text-sm font-semibold tabular-nums">{fmtINR(b.totalAmount)}</p>
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
                  <SwipeToComplete 
                    disabled={b.status === "completed" || b.status === "cancelled" || b.status === "delivered"}
                    onComplete={() => {
                      updateBooking(b.id, { status: "completed", completedAt: new Date().toISOString() });
                      toast.success("Marked as completed!");
                    }}
                  >
                    <Link to="/bookings/$id" params={{ id: b.id }} className={cardCls}>
                      {inner}
                    </Link>
                  </SwipeToComplete>
                )}
              </li>
            );
          })}
        </ul>
      )}

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

function SwipeToComplete({ onComplete, disabled, children }: { onComplete: () => void, disabled: boolean, children: React.ReactNode }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  return (
    <div 
      className="relative w-full rounded-2xl"
      onTouchStart={(e) => {
        if (disabled) return;
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
      }}
      onTouchMove={(e) => {
        if (disabled || startX.current === null || startY.current === null) return;
        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        const dx = x - startX.current;
        const dy = y - startY.current;
        
        // If moving more vertically than horizontally, it's a scroll, so cancel swipe
        if (Math.abs(dy) > Math.abs(dx)) {
          setOffset(0);
          startX.current = null;
          startY.current = null;
          return;
        }
        
        if (dx > 0) {
          setOffset(Math.min(dx, 80)); // cap at 80px
        }
      }}
      onTouchEnd={() => {
        if (disabled || startX.current === null) return;
        startX.current = null;
        startY.current = null;
        if (offset > 50) {
          onComplete();
        }
        setOffset(0);
      }}
    >
      {!disabled && (
        <div className="absolute inset-y-0 left-0 w-full bg-success flex items-center px-6 rounded-2xl" style={{ zIndex: 0 }}>
          <CheckCircle2 className="text-success-foreground size-6" />
        </div>
      )}
      <div 
        style={{ 
          transform: `translateX(${offset}px)`, 
          transition: startX.current === null ? 'transform 0.2s ease-out' : 'none',
          zIndex: 1,
          position: 'relative'
        }}
        className="w-full h-full rounded-2xl bg-card"
      >
        {children}
      </div>
    </div>
  );
}
