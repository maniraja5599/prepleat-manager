import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  X,
  Receipt,
  Search,
  Phone,
  MessageCircle,
  ChevronRight,
  Plus,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
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
import { cn, cleanPhoneForDialing, cleanPhoneForWhatsApp } from "@/lib/utils";

export function RecentBillsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paid" | "due">("all");
  const [sortAsc, setSortAsc] = useState(false); // false = descending (#42, #41, #40), true = ascending (#1, #2...)
  const navigate = useNavigate();

  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const settings = useStore((s) => s.settings);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener("open-recent-bills", handleOpen);
    window.addEventListener("close-recent-bills", handleClose);

    return () => {
      window.removeEventListener("open-recent-bills", handleOpen);
      window.removeEventListener("close-recent-bills", handleClose);
    };
  }, []);

  const parseBillNum = (b: Booking): number => {
    if (!b.billNumber) return 0;
    let cleaned = b.billNumber.trim();
    if (cleaned.includes("-")) {
      cleaned = cleaned.split("-").pop() || cleaned;
    }
    const digits = cleaned.replace(/\D/g, "");
    return parseInt(digits, 10) || 0;
  };

  const sortedAndFiltered = useMemo(() => {
    let list = bookings.slice();

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((b) => {
        const c = customers.find((x) => x.id === b.customerId);
        const billStr = formatShortBillNumber(b.billNumber, b.id).toLowerCase();
        const rawBill = (b.billNumber || "").toLowerCase();
        const custName = (c?.name || "").toLowerCase();
        const custPhone = c?.phone || "";
        return (
          billStr.includes(q) ||
          rawBill.includes(q) ||
          custName.includes(q) ||
          custPhone.includes(q)
        );
      });
    }

    // Filter
    if (filter === "active") {
      list = list.filter((b) => b.status !== "completed" && b.status !== "delivered" && b.status !== "cancelled");
    } else if (filter === "due") {
      list = list.filter((b) => totalDue(b) > 0 && b.status !== "cancelled");
    } else if (filter === "paid") {
      list = list.filter((b) => totalDue(b) === 0 && b.status !== "cancelled");
    }

    // Sort by Bill Number
    list.sort((a, b) => {
      const numA = parseBillNum(a);
      const numB = parseBillNum(b);
      if (numA !== numB) {
        return sortAsc ? numA - numB : numB - numA;
      }
      return sortAsc
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt);
    });

    return list;
  }, [bookings, customers, search, filter, sortAsc]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] bg-background/80 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center animate-in fade-in duration-200"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-2xl saree-gradient flex items-center justify-center text-white shadow-xs">
              <Receipt className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-foreground flex items-center gap-1.5">
                Recent Bills & Bookings
                <span className="text-[10px] bg-primary/10 text-primary font-mono font-bold px-2 py-0.5 rounded-full">
                  {bookings.length} total
                </span>
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Sequential bill order lookup (#1, #2, #42...)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="size-8 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
              title={sortAsc ? "Sort: Lowest Bill # First" : "Sort: Highest Bill # First"}
            >
              <ArrowUpDown className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="size-8 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-3 bg-secondary/30 border-b border-border/20 space-y-2 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Bill #, Customer name, Phone..."
              className="w-full bg-card border border-border/50 rounded-xl py-2 pl-9 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-foreground"
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

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {(
              [
                { id: "all", label: "All Bills" },
                { id: "active", label: "Active Orders" },
                { id: "due", label: "Due Remaining" },
                { id: "paid", label: "Fully Paid" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition cursor-pointer",
                  filter === tab.id
                    ? "saree-gradient text-white shadow-xs"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border/30",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bills List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sortedAndFiltered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              No bills found matching "{search}"
            </div>
          ) : (
            sortedAndFiltered.map((b) => {
              const c = customers.find((x) => x.id === b.customerId);
              const due = totalDue(b);
              const isArtist = !!b.artistId || c?.kind === "artist";
              const tagColor =
                b.service === "prepleat"
                  ? settings.prepleatDotColor ?? "#ffa029"
                  : settings.directDrapeDotColor ?? "#10b981";

              return (
                <div
                  key={b.id}
                  onClick={() => {
                    setIsOpen(false);
                    navigate({ to: "/bookings/$id", params: { id: b.id } });
                  }}
                  className="bg-card hover:bg-secondary/40 border border-border/50 hover:border-primary/40 rounded-2xl p-3 flex items-center justify-between gap-3 transition cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  {/* Left: Bill # & Service */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex flex-col items-center justify-center shrink-0 min-w-[42px] px-2 py-1.5 rounded-xl bg-secondary/80 border border-border/40">
                      <span className="text-xs font-mono font-black text-foreground">
                        {formatShortBillNumber(b.billNumber, b.id)}
                      </span>
                      <span
                        style={{ backgroundColor: tagColor }}
                        className="text-[7.5px] font-bold uppercase text-white px-1 py-0.2 rounded mt-0.5"
                      >
                        {b.service === "prepleat" ? "PRE" : "DRAPE"}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-foreground truncate">
                          {c?.name ?? "Unknown Customer"}
                        </p>
                        {isArtist && (
                          <span className="text-[8px] bg-gold/15 text-gold font-bold px-1.5 py-0.2 rounded-full shrink-0">
                            Artist
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                        <span>
                          {formatAppDate(b.deliveryDate)} · {fmtTime12(b.deliveryTime)}
                        </span>
                        <span>·</span>
                        <span>{b.sareeCount} sarees</span>
                      </div>

                      {c?.phone && (
                        <div
                          className="flex items-center gap-2 mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a
                            href={`tel:${cleanPhoneForDialing(c.phone)}`}
                            className="text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5"
                          >
                            <Phone className="size-2.5" /> {c.phone}
                          </a>
                          <a
                            href={`https://wa.me/${cleanPhoneForWhatsApp(c.phone)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5 hover:underline"
                          >
                            <MessageCircle className="size-2.5" /> WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Status */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-extrabold text-foreground tabular-nums">
                      {fmtINR(netBookingAmount(b))}
                    </p>
                    {due > 0 ? (
                      <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                        {fmtINR(due)} due
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                        Paid ✓
                      </span>
                    )}
                    <ChevronRight className="size-3 text-muted-foreground ml-auto mt-1 opacity-50" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Quick Action */}
        <div className="p-3 border-t border-border/30 bg-card flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              navigate({ to: "/settings" });
            }}
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg transition"
          >
            Settings
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              navigate({ to: "/new" });
            }}
            className="px-4 py-2 rounded-xl saree-gradient text-white text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="size-4" />
            New Booking
          </button>
        </div>
      </div>
    </div>
  );
}
