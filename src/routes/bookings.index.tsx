import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, totalDue, fmtINR, type ServiceType } from "@/lib/store";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Search, IndianRupee } from "lucide-react";

export const Route = createFileRoute("/bookings/")({
  head: () => ({
    meta: [
      { title: "Bookings — Saree Studio" },
      { name: "description", content: "All your PrePleat and Drape bookings, sortable and filterable." },
    ],
  }),
  component: BookingsPage,
});

type Filter = "all" | ServiceType;
type Sort = "delivery" | "recent" | "due";

function BookingsPage() {
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("delivery");
  const [q, setQ] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const list = useMemo(() => {
    let arr = bookings.slice();
    if (filter !== "all") arr = arr.filter((b) => b.service === filter);
    if (!showCompleted) arr = arr.filter((b) => b.status !== "delivered");
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
  }, [bookings, filter, sort, q, showCompleted, customers]);

  const totalDueSum = bookings.reduce((s, b) => s + totalDue(b), 0);

  return (
    <AppShell title="Bookings" subtitle={`${bookings.length} total · ${fmtINR(totalDueSum)} pending`}>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by customer or phone"
          className="w-full bg-card border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
      </div>

      <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
        {(["all", "prepleat", "drape"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition",
              filter === f ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground",
            )}
          >{f}</button>
        ))}
        <div className="w-px bg-border mx-1" />
        {(["delivery", "recent", "due"] as Sort[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition",
              sort === s ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            )}
          >Sort: {s}</button>
        ))}
      </div>

      <label className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} className="accent-primary" />
        Show delivered
      </label>

      {list.length === 0 ? (
        <div className="bg-card card-shadow rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No bookings yet. Tap <span className="font-semibold text-primary">+</span> to create one.
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((b) => {
            const c = customers.find((x) => x.id === b.customerId);
            const due = totalDue(b);
            return (
              <li key={b.id}>
                <Link to="/bookings/$id" params={{ id: b.id }} className="block bg-card card-shadow rounded-2xl p-4 active:scale-[0.99] transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          b.service === "prepleat" ? "bg-[oklch(0.92_0.08_75)] text-[oklch(0.4_0.12_60)]" : "bg-[oklch(0.9_0.06_150)] text-[oklch(0.35_0.12_150)]",
                        )}>{b.service}</span>
                        {b.status === "delivered" && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Delivered</span>}
                      </div>
                      <p className="font-semibold truncate">{c?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(b.deliveryDate), "EEE, MMM d")} · {b.deliveryTime} · {b.sareeCount} saree{b.sareeCount > 1 && "s"}
                      </p>
                    </div>
                    <div className="text-right">
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
