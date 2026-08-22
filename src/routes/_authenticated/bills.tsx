import { createFileRoute, Link } from "@tanstack/react-router";
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
  Eye,
} from "lucide-react";
import { cn, cleanPhoneForDialing, cleanPhoneForWhatsApp } from "@/lib/utils";
import { generateBillPDF } from "@/lib/pdf-bill";
import { PDFPreviewModal } from "@/components/PDFPreviewModal";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bills")({
  component: BillsPage,
});

export function BillsPage() {
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const allPayments = useStore((s) => s.payments);
  const settings = useStore((s) => s.settings);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "due" | "paid" | "cancelled">("all");
  const [sortAsc, setSortAsc] = useState(false);
  const [previewBooking, setPreviewBooking] = useState<Booking | null>(null);

  // Extract pure bill number integer for accurate numerical ordering
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

  // Filter and sort bookings strictly by sequential bill number
  const list = useMemo(() => {
    let arr = bookings.slice();

    // 1. Search Query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      arr = arr.filter((b) => {
        const c = customers.find((x) => x.id === b.customerId);
        const billStr = formatShortBillNumber(b.billNumber, b.id).toLowerCase();
        const rawBill = (b.billNumber || "").toLowerCase();
        const cName = (c?.name || "").toLowerCase();
        const cPhone = (c?.phone || "").toLowerCase();
        return (
          billStr.includes(q) ||
          rawBill.includes(q) ||
          cName.includes(q) ||
          cPhone.includes(q)
        );
      });
    }

    // 2. Status Filter Tab
    if (filter === "due") {
      arr = arr.filter((b) => b.status !== "cancelled" && totalDue(b) > 0);
    } else if (filter === "paid") {
      arr = arr.filter((b) => b.status !== "cancelled" && totalDue(b) === 0);
    } else if (filter === "cancelled") {
      arr = arr.filter((b) => b.status === "cancelled");
    }

    // 3. Strict Sequential Numerical Sort
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

  const totalCount = bookings.length;
  const dueCount = useMemo(() => bookings.filter((b) => b.status !== "cancelled" && totalDue(b) > 0).length, [bookings]);
  const paidCount = useMemo(() => bookings.filter((b) => b.status !== "cancelled" && totalDue(b) === 0).length, [bookings]);
  const totalDueSum = useMemo(
    () => bookings.reduce((sum, b) => (b.status !== "cancelled" ? sum + totalDue(b) : sum), 0),
    [bookings]
  );

  const handleDownloadPDF = async (b: Booking, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const c = customers.find((x) => x.id === b.customerId);
      const artist = b.artistId ? customers.find((x) => x.id === b.artistId) : undefined;
      const bPayments = allPayments.filter((p) => p.bookingId === b.id);
      await generateBillPDF({ booking: b, customer: c, artist, payments: bPayments, settings });
      toast.success(`PDF Bill for ${formatShortBillNumber(b.billNumber, b.id)} generated! 🧾`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF invoice.");
    }
  };

  return (
    <AppShell title="Bills Register" subtitle="Sequential Bill Number Hub (#1, #2...)">
      <div className="max-w-2xl mx-auto space-y-4 pb-20">
        {/* Metric Overview Banner */}
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

        {/* Search Bar & Sort Toggle */}
        <div className="bg-card p-3 rounded-2xl border border-border/40 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Bill #, Customer name, Phone..."
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
              onClick={() => setSortAsc(!sortAsc)}
              className="h-8.5 px-3 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer border border-border/30 shrink-0"
              title={sortAsc ? "Sort: Lowest Bill # First" : "Sort: Highest Bill # First"}
            >
              <ArrowUpDown className="size-3.5" />
              <span>{sortAsc ? "Ascending (#1→)" : "Descending (#→)"}</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-secondary/60 rounded-xl">
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
        </div>

        {/* Sequential Bills List */}
        <div className="space-y-2.5">
          {list.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-2xl border border-border/30">
              <ReceiptText className="size-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">No Bills Found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {search ? "No bookings match your search query." : "No bookings recorded in this category yet."}
              </p>
            </div>
          ) : (
            list.map((b) => {
              const c = customers.find((x) => x.id === b.customerId);
              const due = totalDue(b);
              const netTotal = netBookingAmount(b);
              const isCancelled = b.status === "cancelled";

              const phoneDial = cleanPhoneForDialing(c?.phone);
              const phoneWA = cleanPhoneForWhatsApp(c?.phone);

              return (
                <div
                  key={b.id}
                  className={cn(
                    "bg-card rounded-2xl border p-3.5 shadow-xs transition hover:border-primary/30 flex flex-col gap-2.5 relative group",
                    due > 0 && !isCancelled
                      ? "border-amber-500/30 dark:border-amber-500/20"
                      : isCancelled
                      ? "border-border/30 opacity-60"
                      : "border-border/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Bill Number Badge & Customer Name */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold border border-primary/20">
                          {formatShortBillNumber(b.billNumber, b.id)}
                        </span>
                        <span className="text-xs font-bold text-foreground truncate">
                          {c?.name || "Walk-in Customer"}
                        </span>
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
                        <span>{b.sareeCount} saree{b.sareeCount > 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground" />
                          {formatAppDate(b.deliveryDate)} {b.deliveryTime && `· ${fmtTime12(b.deliveryTime)}`}
                        </span>
                      </div>
                    </div>

                    {/* Financial Pill */}
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

                  {/* Actions Row */}
                  <div className="pt-2 border-t border-border/20 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {phoneDial && (
                        <a
                          href={`tel:${phoneDial}`}
                          className="size-7 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-primary transition"
                          title="Call Customer"
                        >
                          <Phone className="size-3.5" />
                        </a>
                      )}
                      {phoneWA && (
                        <a
                          href={`https://wa.me/${phoneWA}`}
                          target="_blank"
                          rel="noreferrer"
                          className="size-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition"
                          title="WhatsApp Customer"
                        >
                          <MessageCircle className="size-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPreviewBooking(b);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
                        title="Preview & Download Invoice PDF"
                      >
                        <FileText className="size-3.5" />
                        <span>PDF Bill</span>
                      </button>
                    </div>

                    <Link
                      to="/bookings/$id"
                      params={{ id: b.id }}
                      className="px-3 py-1 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                    >
                      <span>View Booking</span>
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

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
    </AppShell>
  );
}
