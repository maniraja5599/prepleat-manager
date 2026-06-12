import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, fmtINR, totalDue } from "@/lib/store";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths } from "date-fns";
import { Search, IndianRupee, ChevronLeft, ChevronRight, TrendingUp, AlertCircle, Wallet, Calendar as CalIcon, Trash2 } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Eyas Saree Drapist" },
      { name: "description", content: "All payments, analytics, customer-wise totals and history." },
    ],
  }),
  component: PaymentsPage,
});

type Tab = "log" | "customer" | "analytics";

function PaymentsPage() {
  const payments = useStore((s) => s.payments);
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const deletePayment = useStore((s) => s.deletePayment);

  const [tab, setTab] = useState<Tab>("log");
  const [monthRef, setMonthRef] = useState(new Date());
  const [q, setQ] = useState("");

  const monthStart = startOfMonth(monthRef);
  const monthEnd = endOfMonth(monthRef);

  const monthPayments = useMemo(
    () => payments.filter((p) => isWithinInterval(parseISO(p.date), { start: monthStart, end: monthEnd })),
    [payments, monthStart, monthEnd],
  );

  const monthCollected = monthPayments.reduce((s, p) => s + p.amount, 0);
  const totalPending = bookings.reduce((s, b) => s + totalDue(b), 0);
  const lifetime = payments.reduce((s, p) => s + p.amount, 0);
  const monthBookingsRevenue = bookings
    .filter((b) => isWithinInterval(parseISO(b.deliveryDate), { start: monthStart, end: monthEnd }))
    .reduce((s, b) => s + b.totalAmount, 0);

  // Daily chart for the month
  const dailyChart = useMemo(() => {
    const map = new Map<string, number>();
    monthPayments.forEach((p) => {
      const k = p.date.slice(0, 10);
      map.set(k, (map.get(k) ?? 0) + p.amount);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, v]) => ({ day: format(parseISO(d), "d"), amount: v }));
  }, [monthPayments]);

  // Mode split
  const modeSplit = useMemo(() => {
    const m: Record<string, number> = { gpay: 0, cash: 0, other: 0 };
    monthPayments.forEach((p) => { m[p.mode ?? "other"] = (m[p.mode ?? "other"] ?? 0) + p.amount; });
    return m;
  }, [monthPayments]);

  // Customer-wise summary across all-time, with search and auto-calc
  const customerSummary = useMemo(() => {
    const rows = customers.map((c) => {
      const cb = bookings.filter((b) => b.customerId === c.id || b.artistId === c.id);
      const billed = cb.reduce((s, b) => s + b.totalAmount, 0);
      const paid = payments.filter((p) => p.customerId === c.id).reduce((s, p) => s + p.amount, 0);
      const due = cb.reduce((s, b) => s + totalDue(b), 0);
      const lastPay = payments.filter((p) => p.customerId === c.id).sort((a, b) => b.date.localeCompare(a.date))[0];
      return { c, billed, paid, due, count: cb.length, lastPay };
    }).filter((r) => r.count > 0);
    const ql = q.trim().toLowerCase();
    const filtered = ql
      ? rows.filter((r) => r.c.name.toLowerCase().includes(ql) || r.c.phone.includes(ql))
      : rows;
    return filtered.sort((a, b) => b.due - a.due || b.paid - a.paid);
  }, [customers, bookings, payments, q]);

  const searchedTotals = useMemo(() => {
    return customerSummary.reduce(
      (acc, r) => ({ billed: acc.billed + r.billed, paid: acc.paid + r.paid, due: acc.due + r.due }),
      { billed: 0, paid: 0, due: 0 },
    );
  }, [customerSummary]);

  const logList = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const arr = monthPayments
      .map((p) => {
        const c = customers.find((x) => x.id === p.customerId);
        const b = bookings.find((x) => x.id === p.bookingId);
        return { p, c, b };
      })
      .filter(({ c }) => !ql || c?.name.toLowerCase().includes(ql) || c?.phone.includes(ql));
    return arr.sort((a, b) => b.p.date.localeCompare(a.p.date));
  }, [monthPayments, customers, bookings, q]);

  return (
    <AppShell title="Payments">
      {/* Month switcher */}
      <div className="flex items-center justify-between mb-3 bg-card card-shadow rounded-2xl px-2 py-1.5">
        <button onClick={() => setMonthRef(subMonths(monthRef, 1))} className="size-9 rounded-full flex items-center justify-center active:bg-secondary">
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex items-center gap-1.5 font-display font-semibold">
          <CalIcon className="size-4 text-primary" />
          {format(monthRef, "MMMM yyyy")}
        </div>
        <button onClick={() => setMonthRef(addMonths(monthRef, 1))} className="size-9 rounded-full flex items-center justify-center active:bg-secondary">
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat tint="success" icon={<Wallet className="size-3.5" />} label="Collected (mo)" value={fmtINR(monthCollected)} />
        <Stat tint="danger" icon={<AlertCircle className="size-3.5" />} label="Pending (all)" value={fmtINR(totalPending)} />
        <Stat tint="primary" icon={<TrendingUp className="size-3.5" />} label="Billed (mo)" value={fmtINR(monthBookingsRevenue)} />
        <Stat tint="muted" icon={<IndianRupee className="size-3.5" />} label="Lifetime" value={fmtINR(lifetime)} />
      </div>

      {/* Tabs */}
      <div className="bg-secondary rounded-full p-0.5 flex mb-3">
        {(["log", "customer", "analytics"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition",
              tab === t ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground",
            )}
          >{t === "log" ? "Log" : t === "customer" ? "Customer" : "Analytics"}</button>
        ))}
      </div>

      {tab !== "analytics" && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === "customer" ? "Search customer (auto-calc total)" : "Search payments by customer"}
            className="w-full bg-card border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>
      )}

      {tab === "log" && (
        <div className="space-y-2">
          {logList.length === 0 ? (
            <div className="bg-card card-shadow rounded-2xl p-8 text-center text-sm text-muted-foreground">
              No payments in {format(monthRef, "MMMM")}.
            </div>
          ) : (
            <>
              <div className="text-[11px] text-muted-foreground px-1 flex justify-between">
                <span>{logList.length} payment{logList.length > 1 ? "s" : ""}</span>
                <span className="font-semibold tabular-nums">{fmtINR(logList.reduce((s, x) => s + x.p.amount, 0))}</span>
              </div>
              <ul className="space-y-2">
                {logList.map(({ p, c, b }) => (
                  <li key={p.id} className="bg-card card-shadow rounded-2xl p-3 flex items-start gap-3">
                    <div className={cn(
                      "shrink-0 size-10 rounded-xl flex items-center justify-center text-[10px] font-bold uppercase",
                      p.mode === "gpay" ? "bg-[oklch(0.92_0.08_240)] text-[oklch(0.4_0.18_240)]"
                        : p.mode === "cash" ? "bg-[oklch(0.92_0.1_140)] text-[oklch(0.35_0.15_140)]"
                        : "bg-muted text-muted-foreground",
                    )}>{(p.mode ?? "other").slice(0, 4)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-semibold truncate">{c?.name ?? "Unknown"}</p>
                        <p className="font-bold tabular-nums text-success">{fmtINR(p.amount)}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {format(parseISO(p.date), "EEE, MMM d · h:mm a")}
                        {b ? ` · ${b.service} ×${b.sareeCount}` : ""}
                      </p>
                      {p.note && <p className="text-[11px] text-muted-foreground italic mt-0.5 truncate">"{p.note}"</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        {b && (
                          <Link to="/bookings/$id" params={{ id: b.id }} className="text-[10px] font-semibold text-primary">View booking →</Link>
                        )}
                        <button
                          onClick={() => { if (confirm("Delete this payment?")) deletePayment(p.id); }}
                          className="ml-auto text-[10px] font-semibold text-destructive flex items-center gap-0.5"
                        ><Trash2 className="size-3" /> Delete</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === "customer" && (
        <div className="space-y-2">
          {q.trim() && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Billed</p>
                <p className="font-bold tabular-nums text-sm">{fmtINR(searchedTotals.billed)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Paid</p>
                <p className="font-bold tabular-nums text-sm text-success">{fmtINR(searchedTotals.paid)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Due</p>
                <p className={cn("font-bold tabular-nums text-sm", searchedTotals.due > 0 ? "text-destructive" : "text-success")}>{fmtINR(searchedTotals.due)}</p>
              </div>
            </div>
          )}
          {customerSummary.length === 0 ? (
            <div className="bg-card card-shadow rounded-2xl p-8 text-center text-sm text-muted-foreground">No matching customers.</div>
          ) : (
            <ul className="space-y-2">
              {customerSummary.map(({ c, billed, paid, due, count, lastPay }) => (
                <li key={c.id}>
                  <Link to="/customers/$id" params={{ id: c.id }} className="block bg-card card-shadow rounded-2xl p-3 active:scale-[0.99] transition">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <p className="font-semibold truncate flex items-center gap-1.5">
                          {c.name}
                          {c.kind === "artist" && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold/20 text-gold font-bold">ARTIST</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{count} booking{count > 1 ? "s" : ""}{lastPay ? ` · last paid ${format(parseISO(lastPay.date), "MMM d")}` : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums">{fmtINR(paid)}</p>
                        <p className={cn("text-[11px] font-semibold tabular-nums", due > 0 ? "text-destructive" : "text-success")}>
                          {due > 0 ? `${fmtINR(due)} due` : "Paid"}
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-success" style={{ width: `${billed > 0 ? Math.min(100, (paid / billed) * 100) : 0}%` }} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-3">
          <div className="bg-card card-shadow rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Daily collection · {format(monthRef, "MMM")}</p>
              <p className="text-[11px] font-bold tabular-nums">{fmtINR(monthCollected)}</p>
            </div>
            <div className="h-36">
              {dailyChart.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No data this month</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChart} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                    <Tooltip
                      cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                      contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [fmtINR(v), "Collected"]}
                    />
                    <Bar dataKey="amount" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-card card-shadow rounded-2xl p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Payment mode split</p>
            <div className="grid grid-cols-3 gap-2">
              {(["gpay", "cash", "other"] as const).map((m) => {
                const pct = monthCollected > 0 ? Math.round((modeSplit[m] / monthCollected) * 100) : 0;
                return (
                  <div key={m} className="bg-secondary rounded-xl p-2 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{m}</p>
                    <p className="font-bold tabular-nums text-sm mt-0.5">{fmtINR(modeSplit[m])}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card card-shadow rounded-2xl p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Last 6 months</p>
            <ul className="space-y-1.5">
              {Array.from({ length: 6 }).map((_, i) => {
                const ref = subMonths(new Date(), i);
                const s = startOfMonth(ref), e = endOfMonth(ref);
                const sum = payments
                  .filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e }))
                  .reduce((acc, p) => acc + p.amount, 0);
                const max = Math.max(1, ...Array.from({ length: 6 }).map((_, j) => {
                  const r = subMonths(new Date(), j); const ss = startOfMonth(r), ee = endOfMonth(r);
                  return payments.filter((p) => isWithinInterval(parseISO(p.date), { start: ss, end: ee })).reduce((a, p) => a + p.amount, 0);
                }));
                return (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-muted-foreground">{format(ref, "MMM")}</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(sum / max) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right font-semibold tabular-nums">{fmtINR(sum)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: "primary" | "success" | "danger" | "muted" }) {
  const tintCls =
    tint === "primary" ? "text-primary" :
    tint === "success" ? "text-success" :
    tint === "danger" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="bg-card card-shadow rounded-2xl p-3">
      <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold ${tintCls}`}>
        {icon}<span>{label}</span>
      </div>
      <p className="text-lg font-display font-semibold mt-1 tabular-nums">{value}</p>
    </div>
  );
}
