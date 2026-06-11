import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, totalDue, fmtINR, fmtTime12, type ServiceType } from "@/lib/store";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Search, IndianRupee, SlidersHorizontal, X as XIcon } from "lucide-react";
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

type Filter = "all" | ServiceType;
type Sort = "delivery" | "recent" | "due";
type Range = "all" | "thisMonth" | "lastMonth" | "custom";

function BookingsPage() {
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("delivery");
  const [q, setQ] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [range, setRange] = useState<Range>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount =
    (filter !== "all" ? 1 : 0) + (range !== "all" ? 1 : 0) + (sort !== "delivery" ? 1 : 0) + (showCompleted ? 1 : 0);

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
    if (filter !== "all") arr = arr.filter((b) => b.service === filter);
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
  }, [bookings, filter, sort, q, showCompleted, customers, dateBounds]);

  const totalDueSum = list.reduce((s, b) => s + totalDue(b), 0);

  return (
    <AppShell title="Bookings" subtitle={`${list.length} shown · ${fmtINR(totalDueSum)} pending`}>
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
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "shrink-0 size-11 rounded-full flex items-center justify-center relative transition",
            showFilters || activeFilterCount > 0 ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground",
          )}
          aria-label="Filters"
        >
          <SlidersHorizontal className="size-4" />
          {activeFilterCount > 0 && !showFilters && (
            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-[10px] text-white font-bold flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="bg-card card-shadow rounded-2xl p-3 mb-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Filters</p>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilter("all"); setRange("all"); setSort("delivery"); setShowCompleted(false); setFrom(""); setTo(""); }}
                className="text-[11px] text-primary font-semibold flex items-center gap-1"
              ><XIcon className="size-3" /> Clear all</button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {(["all", "prepleat", "drape"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap transition",
                  filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                )}
              >{f}</button>
            ))}
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
            const due = totalDue(b);
            return (
              <li key={b.id}>
                <Link to="/bookings/$id" params={{ id: b.id }} className="block bg-card card-shadow rounded-2xl p-4 active:scale-[0.99] transition">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          b.service === "prepleat" ? "bg-[oklch(0.92_0.08_75)] text-[oklch(0.4_0.12_60)]" : "bg-[oklch(0.9_0.06_150)] text-[oklch(0.35_0.12_150)]",
                        )}>{b.service}</span>
                        {b.status === "delivered" && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Delivered</span>}
                      </div>
                      <p className="font-semibold truncate">{c?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {format(parseISO(b.deliveryDate), "EEE, MMM d")} · {fmtTime12(b.deliveryTime)} · {b.sareeCount} saree{b.sareeCount > 1 && "s"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
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