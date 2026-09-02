import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  useStore,
  fmtINR,
  totalDue,
  netBookingAmount,
  formatShortBillNumber,
  formatAppDate,
  fmtTime12,
  type Booking,
} from "@/lib/store";
import { useState, useMemo } from "react";
import {
  ReceiptText,
  Search,
  ArrowUpDown,
  Phone,
  MessageCircle,
  ChevronRight,
  FileText,
  Calendar,
  X,
  CheckSquare,
  Square,
  Layers,
  Check,
} from "lucide-react";
import { cn, cleanPhoneForDialing, cleanPhoneForWhatsApp } from "@/lib/utils";
import { generateBillPDF } from "@/lib/pdf-bill";
import { PDFPreviewModal } from "@/components/PDFPreviewModal";
import { ConsolidatedBillModal } from "@/components/ConsolidatedBillModal";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/bills")({
  component: BillsPage,
});

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

export function BillsPage() {
  const navigate = useNavigate();
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const allPayments = useStore((s) => s.payments);
  const settings = useStore((s) => s.settings);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "due" | "paid" | "cancelled">("all");
  const [sortAsc, setSortAsc] = useState(false);
  const [previewBooking, setPreviewBooking] = useState<Booking | null>(null);

  // Multi-Bill Select state for Consolidated Statement
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConsolidatedModal, setShowConsolidatedModal] = useState(false);

  const getBillInt = (b: Booking): number => {
    if (!b.billNumber) return 0;
    const cleaned = b.billNumber.trim().replace(/^#+/, "");
    if (cleaned.includes("-")) {
      const part = cleaned.split("-").pop() || "";
      const n = parseInt(part.replace(/\D/g, ""), 10);
      return isNaN(n) ? 0 : n;
    }
    const num = parseInt(cleaned.replace(/\D/g, ""), 10);
    return isNaN(num) ? 0 : num;
  };

  const list = useMemo(() => {
    let arr = [...bookings];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      arr = arr.filter((b) => {
        const c = customers.find((x) => x.id === b.customerId);
        const art = b.artistId ? customers.find((x) => x.id === b.artistId) : null;
        const bill = formatShortBillNumber(b.billNumber, b.id).toLowerCase();
        const rawBill = (b.billNumber || "").toLowerCase();
        const name = (c?.name || "").toLowerCase();
        const artName = (art?.name || "").toLowerCase();
        const phone = (c?.phone || "").toLowerCase();
        return (
          bill.includes(q) ||
          rawBill.includes(q) ||
          name.includes(q) ||
          artName.includes(q) ||
          phone.includes(q)
        );
      });
    }

    if (filter === "due") {
      arr = arr.filter((b) => b.status !== "cancelled" && totalDue(b) > 0);
    } else if (filter === "paid") {
      arr = arr.filter((b) => b.status !== "cancelled" && totalDue(b) === 0);
    } else if (filter === "cancelled") {
      arr = arr.filter((b) => b.status === "cancelled");
    }

    arr.sort((a, b) => {
      const aInt = getBillInt(a);
      const bInt = getBillInt(b);
      if (aInt !== bInt) {
        return sortAsc ? aInt - bInt : bInt - aInt;
      }
      return sortAsc
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return arr;
  }, [bookings, customers, search, filter, sortAsc]);

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, { monthKey: string; monthLabel: string; items: typeof list }>();

    for (const b of list) {
      let monthKey = "Unknown";
      let monthLabel = "Other";
      try {
        const d = parseISO(b.deliveryDate || b.createdAt);
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

  const totalCount = bookings.length;
  const dueCount = useMemo(() => bookings.filter((b) => b.status !== "cancelled" && totalDue(b) > 0).length, [bookings]);
  const paidCount = useMemo(() => bookings.filter((b) => b.status !== "cancelled" && totalDue(b) === 0).length, [bookings]);
  const totalDueSum = useMemo(
    () => bookings.reduce((sum, b) => (b.status !== "cancelled" ? sum + totalDue(b) : sum), 0),
    [bookings]
  );

  const toggleSelectBooking = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const next = new Set<string>();
    list.forEach((b) => next.add(b.id));
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Selected bookings array
  const selectedBookingsList = useMemo(() => {
    return bookings.filter((b) => selectedIds.has(b.id));
  }, [bookings, selectedIds]);

  const selectedTotal = useMemo(() => {
    return selectedBookingsList.reduce((s, b) => s + netBookingAmount(b), 0);
  }, [selectedBookingsList]);

  const selectedDue = useMemo(() => {
    return selectedBookingsList.reduce((s, b) => s + totalDue(b), 0);
  }, [selectedBookingsList]);

  // Primary customer / artist for statement header
  const primaryClient = useMemo(() => {
    if (selectedBookingsList.length === 0) return null;
    const first = selectedBookingsList[0];
    if (first.artistId) {
      const art = customers.find((c) => c.id === first.artistId);
      if (art) return art;
    }
    return customers.find((c) => c.id === first.customerId) || null;
  }, [selectedBookingsList, customers]);

  return (
    <AppShell title="Bills Register" subtitle="Sequential Bill Number Hub (#1, #2...)">
      <div className="max-w-2xl mx-auto space-y-4 pb-28">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "p-3 rounded-2xl border text-left transition cursor-pointer active:scale-95 shadow-xs",
              filter === "all"
                ? "bg-primary/10 border-primary/40 ring-2 ring-primary/20"
                : "bg-card border-border/40 hover:bg-secondary/60 hover:border-border/80"
            )}
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Total Bills
            </span>
            <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("due")}
            className={cn(
              "p-3 rounded-2xl border text-left transition cursor-pointer active:scale-95 shadow-xs",
              filter === "due"
                ? "bg-destructive/10 border-destructive/40 ring-2 ring-destructive/20"
                : "bg-card border-border/40 hover:bg-secondary/60 hover:border-border/80"
            )}
          >
            <span className="text-[10px] uppercase font-bold text-destructive tracking-wider block">
              Pending Due
            </span>
            <span className="text-xl font-bold font-mono text-destructive mt-0.5 block">
              {dueCount} <span className="text-[10px] font-sans font-semibold text-muted-foreground">({fmtINR(totalDueSum)})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("paid")}
            className={cn(
              "p-3 rounded-2xl border text-left transition cursor-pointer active:scale-95 shadow-xs",
              filter === "paid"
                ? "bg-success/10 border-success/40 ring-2 ring-success/20"
                : "bg-card border-border/40 hover:bg-secondary/60 hover:border-border/80"
            )}
          >
            <span className="text-[10px] uppercase font-bold text-success tracking-wider block">
              Fully Paid
            </span>
            <span className="text-xl font-bold font-mono text-success mt-0.5 block">
              {paidCount}
            </span>
          </button>
        </div>

        {/* Search, Sort and Multi-Bill Toggle Deck */}
        <div className="sticky-search-deck bg-background/95 backdrop-blur-md p-2.5 rounded-2xl border border-border/40 shadow-xs space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Bill #, Artist, Customer, Phone..."
                className="w-full bg-secondary border border-border/40 rounded-xl py-2 pl-9 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-foreground"
              />
              <Search className="size-3.5 text-muted-foreground absolute left-3 top-2.5" />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2 size-5 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                if (isMultiSelectMode) clearSelection();
              }}
              className={cn(
                "h-8.5 px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition cursor-pointer border shrink-0",
                isMultiSelectMode
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-secondary hover:bg-secondary/80 text-foreground border-border/30",
              )}
              title="Select Multiple Bills to Combine"
            >
              <Layers className="size-3.5" />
              <span>{isMultiSelectMode ? "Done Selecting" : "Combine Bills"}</span>
            </button>

            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="h-8.5 px-2.5 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer border border-border/30 shrink-0"
              title={sortAsc ? "Sort: Lowest Bill # First" : "Sort: Highest Bill # First"}
            >
              <ArrowUpDown className="size-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="grid grid-cols-4 gap-1 p-1 bg-secondary/60 rounded-xl flex-1">
              {(
                [
                  { id: "all", label: "All", count: totalCount },
                  { id: "due", label: "Due", count: dueCount },
                  { id: "paid", label: "Paid", count: paidCount },
                  { id: "cancelled", label: "Cancelled", count: bookings.filter((b) => b.status === "cancelled").length },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilter(t.id)}
                  className={cn(
                    "py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1",
                    filter === t.id
                      ? "bg-card text-foreground shadow-xs border border-border/40 font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{t.label}</span>
                  <span
                    className={cn(
                      "text-[9px] px-1 py-0.2 rounded-full font-mono font-semibold",
                      filter === t.id ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {isMultiSelectMode && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer border border-border/30"
                >
                  Select All
                </button>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-destructive/10 text-destructive hover:bg-destructive/20 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {groupedByMonth.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-2xl border border-border/30">
            <ReceiptText className="size-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">No Bills Found</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {search ? "No bookings match your search query." : "No bookings recorded in this category yet."}
            </p>
          </div>
        ) : (
          <div
            className="relative pl-6 sm:pl-7 space-y-6 before:absolute before:left-2.5 sm:before:left-3 before:top-4 before:bottom-4 before:w-[2px] before:bg-gradient-to-b before:from-primary/50 before:via-border before:to-border/20 select-none touch-manipulation"
            style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
          >
            {groupedByMonth.map((group, gIdx) => {
              const theme = MONTH_THEMES[gIdx % MONTH_THEMES.length];
              const monthTotal = group.items.reduce((s, b) => s + netBookingAmount(b), 0);
              const monthSarees = group.items.reduce((s, b) => s + (b.sareeCount || 1), 0);
              const monthDue = group.items.reduce((s, b) => s + (b.status !== "cancelled" ? totalDue(b) : 0), 0);

              return (
                <div key={group.monthKey} className="relative">
                  <div
                    className={cn(
                      "absolute -left-6 sm:-left-7 top-3.5 size-3.5 rounded-full border-2 border-background shadow-xs flex items-center justify-center -translate-x-[2px] z-10",
                      theme.dot,
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full animate-ping opacity-75", theme.dotPing)} />
                  </div>

                  <section
                    className={cn(
                      "border rounded-3xl p-3 sm:p-4 space-y-3 shadow-xs transition-all",
                      theme.bg,
                      theme.border,
                    )}
                  >
                    {/* Month Header */}
                    <div
                      className={cn(
                        "sticky-month-header-bills -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 px-3 sm:px-4 py-2.5 rounded-t-3xl bg-card border-b border-border/50 shadow-xs flex items-center justify-between gap-2 flex-wrap transition-all",
                      )}
                    >
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-xl text-xs font-display font-extrabold tracking-wide flex items-center gap-1.5 shadow-2xs",
                            theme.badge,
                          )}
                        >
                          <Calendar className="size-3.5" />
                          <span>{group.monthLabel}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground flex-wrap justify-end">
                        <span className="font-semibold text-foreground">
                          {group.items.length} {group.items.length === 1 ? "Bill" : "Bills"} ({monthSarees} Sarees)
                        </span>
                        <span>·</span>
                        <span className="text-primary font-bold">{fmtINR(monthTotal)}</span>
                        {monthDue > 0 ? (
                          <>
                            <span>·</span>
                            <span className="text-destructive font-bold">Due: {fmtINR(monthDue)}</span>
                          </>
                        ) : (
                          <>
                            <span>·</span>
                            <span className="text-success font-bold">100% Paid ✓</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {group.items.map((b) => {
                        const c = customers.find((x) => x.id === b.customerId);
                        const art = b.artistId ? customers.find((x) => x.id === b.artistId) : null;
                        const due = totalDue(b);
                        const netTotal = netBookingAmount(b);
                        const isCancelled = b.status === "cancelled";
                        const isSelected = selectedIds.has(b.id);

                        const phoneDial = cleanPhoneForDialing(c?.phone);
                        const phoneWA = cleanPhoneForWhatsApp(c?.phone);

                        return (
                          <div
                            key={b.id}
                            onClick={(e) => {
                              if (isMultiSelectMode) {
                                toggleSelectBooking(b.id, e);
                              } else {
                                navigate({ to: "/bookings/$id", params: { id: b.id } });
                              }
                            }}
                            className={cn(
                              "bg-card rounded-2xl border p-3.5 shadow-xs transition hover:border-primary/40 active:scale-[0.99] cursor-pointer flex flex-col gap-2.5 relative group select-none",
                              isSelected
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                : due > 0 && !isCancelled
                                ? "border-amber-500/30 dark:border-amber-500/20"
                                : isCancelled
                                ? "border-border/30 opacity-60"
                                : "border-border/40",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              {isMultiSelectMode && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleSelectBooking(b.id, e)}
                                  className="size-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                >
                                  {isSelected ? (
                                    <div className="size-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                                      <Check className="size-3.5 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="size-5 rounded-md border-2 border-muted-foreground/40" />
                                  )}
                                </button>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold border border-primary/20">
                                    {formatShortBillNumber(b.billNumber, b.id)}
                                  </span>
                                  <span className="text-xs font-bold text-foreground truncate">
                                    {c?.name || "Walk-in Customer"}
                                  </span>
                                  {art && (
                                    <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                      Artist: {art.name}
                                    </span>
                                  )}
                                  {c?.phone && (
                                    <span className="text-[11px] font-mono text-muted-foreground">
                                      {c.phone}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                                  <span className="capitalize font-semibold text-foreground/80">
                                    {b.service === "prepleat" ? "Pre-Pleat" : "Direct Drape"}
                                  </span>
                                  <span>·</span>
                                  <span>{b.sareeCount} {b.sareeCount > 1 ? "sarees" : "saree"}</span>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="size-3 text-muted-foreground" />
                                    {formatAppDate(b.deliveryDate)} {b.deliveryTime && ("· " + fmtTime12(b.deliveryTime))}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xs font-bold font-mono text-foreground block">
                                  {fmtINR(netTotal)}
                                </span>
                                {isCancelled ? (
                                  <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                                    Cancelled
                                  </span>
                                ) : due > 0 ? (
                                  <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                                    Due: {fmtINR(due)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded">
                                    Paid ✓
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-border/20 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                {phoneDial && (
                                  <a
                                    href={"tel:" + phoneDial}
                                    onClick={(e) => e.stopPropagation()}
                                    className="size-7 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-primary transition"
                                    title="Call Customer"
                                  >
                                    <Phone className="size-3.5" />
                                  </a>
                                )}
                                {phoneWA && (
                                  <a
                                    href={"https://wa.me/" + phoneWA}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="size-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition"
                                    title="WhatsApp Customer"
                                  >
                                    <MessageCircle className="size-3.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewBooking(b);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-[10.5px] font-bold text-foreground flex items-center gap-1 transition"
                                >
                                  <FileText className="size-3 text-primary" />
                                  <span>View Bill</span>
                                </button>
                              </div>

                              <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Multi-Bill Action Bar */}
        {isMultiSelectMode && selectedIds.size > 0 && (
          <div className="fixed bottom-16 sm:bottom-6 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 max-w-xl w-full z-40 bg-card/95 backdrop-blur-md p-3.5 rounded-3xl border border-primary/40 shadow-2xl animate-in slide-in-from-bottom-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">
                {selectedIds.size} {selectedIds.size === 1 ? "Bill" : "Bills"} Selected
              </p>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                Total: <span className="font-bold text-foreground">{fmtINR(selectedTotal)}</span> · Due: <span className={selectedDue > 0 ? "font-bold text-destructive" : "font-bold text-success"}>{fmtINR(selectedDue)}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConsolidatedModal(true)}
                className="px-4 py-2.5 rounded-2xl saree-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
              >
                <Layers className="size-3.5" />
                <span>Combine Statement</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Single Bill PDF Preview Modal */}
      {previewBooking && (
        <PDFPreviewModal
          open={!!previewBooking}
          onClose={() => setPreviewBooking(null)}
          booking={previewBooking}
          customer={customers.find((c) => c.id === previewBooking.customerId)}
          artist={previewBooking.artistId ? customers.find((c) => c.id === previewBooking.artistId) : undefined}
          payments={allPayments.filter((p) => p.bookingId === previewBooking.id)}
          settings={settings}
        />
      )}

      {/* Multi-Bill Consolidated Statement Modal */}
      {showConsolidatedModal && (
        <ConsolidatedBillModal
          open={showConsolidatedModal}
          onClose={() => setShowConsolidatedModal(false)}
          clientOrArtist={primaryClient}
          selectedBookings={selectedBookingsList}
          allCustomers={customers}
          settings={settings}
        />
      )}
    </AppShell>
  );
}
