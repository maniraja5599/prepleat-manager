import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, totalDue, fmtINR, fmtTime12, type ServiceType } from "@/lib/store";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Search, IndianRupee, SlidersHorizontal, X as XIcon, History } from "lucide-react";
import { BookingRequestsInbox } from "@/components/BookingRequestsInbox";


export const Route = createFileRoute("/_authenticated/bookings/")({
  head: () => ({
    meta: [
      { title: "Bookings — Eyas Saree Drapist" },
      { name: "description", content: "All your PrePleat and Drape bookings, sortable and filterable." },
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
  const [svc, setSvc] = useState<SvcFilter>("all");
  const [pay, setPay] = useState<PayFilter>("all");
  const [sort, setSort] = useState<Sort>("delivery");
  const [q, setQ] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [range, setRange] = useState<Range>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showMore, setShowMore] = useState(false);

  const moreCount = (range !== "all" ? 1 : 0) + (sort !== "delivery" ? 1 : 0) + (showCompleted ? 1 : 0);

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
    if (svc !== "all") arr = arr.filter((b) => b.service === svc);
    if (pay === "paid") arr = arr.filter((b) => totalDue(b) === 0);
    if (pay === "due") arr = arr.filter((b) => totalDue(b) > 0);
    if (!showCompleted) arr = arr.filter((b) => b.status !== "delivered");
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
      if (sort === "delivery") return a.deliveryDate.localeCompare(b.deliveryDate) || a.deliveryTime.localeCompare(b.deliveryTime);
      if (sort === "recent") return b.createdAt.localeCompare(a.createdAt);
      return totalDue(b) - totalDue(a);
    });
    return arr;
  }, [bookings, svc, pay, sort, q, showCompleted, customers, dateBounds]);

  const collected = list.reduce((s, b) => s + b.advancePaid, 0);
  const pending = list.reduce((s, b) => s + totalDue(b), 0);

  return (
    <AppShell title="Bookings">
      {/* Slim stat chips */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar items-center">
        <StatChip label="Total" value={String(list.length)} />
        <StatChip label="Collected" value={fmtINR(collected)} tone="success" />
        <StatChip label="Pending" value={fmtINR(pending)} tone={pending > 0 ? "danger" : "muted"} />
        <button
          onClick={() => { setShowCompleted((v) => !v); setSort("recent"); }}
          className={cn(
            "shrink-0 ml-auto rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition",
            showCompleted ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground",
          )}
        >
          <History className="size-3.5" /> Past
        </button>
      </div>

      <BookingRequestsInbox />

      <div className="flex gap-2 mb-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer or phone"
            className="w-full bg-card border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={() => setShowMore((v) => !v)}
          className={cn(
            "shrink-0 size-11 rounded-full flex items-center justify-center relative transition",
            showMore || moreCount > 0 ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground",
          )}
          aria-label="More filters"
        >
          <SlidersHorizontal className="size-4" />
          {moreCount > 0 && !showMore && (
            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-[10px] text-white font-bold flex items-center justify-center">{moreCount}</span>
          )}
        </button>
      </div>

      {/* Always-visible primary filters */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <SegRow value={svc} onChange={setSvc} items={[
          { id: "all", label: "All" },
          { id: "prepleat", label: "PrePleat" },
          { id: "drape", label: "Drape" },
        ] as { id: SvcFilter; label: string }[]} />
        <SegRow value={pay} onChange={setPay} items={[
          { id: "all", label: "All" },
          { id: "due", label: "Due" },
          { id: "paid", label: "Paid" },
        ] as { id: PayFilter; label: string }[]} />
      </div>

      {showMore && (
        <div className="bg-card card-shadow rounded-2xl p-3 mb-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">More filters</p>
            {moreCount > 0 && (
              <button
                onClick={() => { setRange("all"); setSort("delivery"); setShowCompleted(false); setFrom(""); setTo(""); }}
                className="text-[11px] text-primary font-semibold flex items-center gap-1"
              ><XIcon className="size-3" /> Clear</button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {([
              { id: "all" as Range, label: "All time" },
              { id: "thisMonth" as Range, label: "This month" },
              { id: "lastMonth" as Range, label: "Last month" },
              { id: "custom" as Range, label: "Custom" },
            ]).map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition",
                  range === r.id ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground",
                )}
              >{r.label}</button>
            ))}
          </div>
          {range === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-secondary rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          )}
          <div className="flex gap-1.5 items-center overflow-x-auto no-scrollbar">
            {(["delivery", "recent", "due"] as Sort[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition",
                  sort === s ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                )}
              >Sort: {s}</button>
            ))}
            <label className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap">
              <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} className="accent-primary" />
              Delivered
            </label>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="bg-card card-shadow rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No bookings match. Tap <span className="font-semibold text-primary">+</span> to create one.
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((b) => {
            const c = customers.find((x) => x.id === b.customerId);
            const a = b.artistId ? customers.find((x) => x.id === b.artistId) : undefined;
            const due = totalDue(b);
            const isArtistBooking = !!b.artistId || c?.kind === "artist";
            return (
              <li key={b.id}>
                <Link to="/bookings/$id" params={{ id: b.id }} className={cn(
                  "block bg-card card-shadow rounded-2xl p-4 active:scale-[0.99] transition relative overflow-hidden",
                  isArtistBooking && "ring-1 ring-gold/50 bg-gradient-to-br from-card to-gold/5",
                  b.status === "cancelled" && "opacity-60",
                )}>
                  {isArtistBooking && (
                    <span className="absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-bl-xl bg-gold text-white">
                      ★ Artist
                    </span>
                  )}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          b.service === "prepleat" ? "bg-[oklch(0.92_0.08_75)] text-[oklch(0.4_0.12_60)]" : "bg-[oklch(0.9_0.06_150)] text-[oklch(0.35_0.12_150)]",
                        )}>{b.service}</span>
                        {b.status === "delivered" && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Delivered</span>}
                        {b.status === "cancelled" && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">Cancelled</span>}
                        {b.billNumber && <span className="text-[9px] font-mono text-muted-foreground/70">#{b.billNumber.split("-").pop()}</span>}
                      </div>
                      <p className="font-semibold truncate">{c?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {format(parseISO(b.deliveryDate), "EEE, MMM d")} · {fmtTime12(b.deliveryTime)} · {b.sareeCount} saree{b.sareeCount > 1 && "s"}
                      </p>
                      {a && (
                        <p className="text-[10px] text-gold font-semibold mt-0.5 truncate">via {a.name}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 pt-1">
                      <p className="text-sm font-semibold tabular-nums">{fmtINR(b.totalAmount)}</p>
                      {due > 0 ? (
                        <p className="text-xs text-destructive font-semibold flex items-center justify-end"><IndianRupee className="size-3" />{Math.round(due).toLocaleString("en-IN")} due</p>
                      ) : (
                        <p className="text-xs text-success font-semibold">Paid</p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

function StatChip({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "danger" | "muted" }) {
  const toneClass = {
    default: "bg-card text-foreground",
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <div className={cn("shrink-0 rounded-full px-3 py-1.5 flex items-baseline gap-1.5 card-shadow", toneClass)}>
      <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-xs font-bold tabular-nums">{value}</span>
    </div>
  );
}

function SegRow<T extends string>({ value, onChange, items }: {
  value: T; onChange: (v: T) => void; items: { id: T; label: string }[];
}) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-1 flex gap-0.5 shadow-sm">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={cn(
            "flex-1 py-1.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition",
            value === it.id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-secondary/80",
          )}
        >{it.label}</button>
      ))}
    </div>
  );
}
