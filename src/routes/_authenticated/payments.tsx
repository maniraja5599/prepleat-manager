import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, fmtINR, totalDue } from "@/lib/store";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { IndianRupee, TrendingUp, AlertCircle, Wallet, Download, FileText, Sparkles, TrendingDown, Users, Crown, CalendarCheck, ArrowRight } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, AreaChart, Area, CartesianGrid } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Eyas Saree Drapist" },
      { name: "description", content: "Lifetime collection, analytics, top customers and payment trends." },
    ],
  }),
  component: PaymentsPage,
});

const rs = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");

function PaymentsPage() {
  const payments = useStore((s) => s.payments);
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const businessName = useStore((s) => s.settings.businessName);

  const [exportOpen, setExportOpen] = useState(false);

  // === All-time aggregates ===
  const lifetime = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const totalPending = useMemo(() => bookings.reduce((s, b) => s + totalDue(b), 0), [bookings]);
  const totalBilled = useMemo(() => bookings.reduce((s, b) => s + b.totalAmount, 0), [bookings]);
  const collectionRate = totalBilled > 0 ? Math.min(100, Math.round((lifetime / totalBilled) * 100)) : 0;

  const now = new Date();
  const today = useMemo(() => {
    const s = startOfDay(now), e = endOfDay(now);
    return payments.filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e })).reduce((a, p) => a + p.amount, 0);
  }, [payments]);
  const thisWeek = useMemo(() => {
    const s = startOfWeek(now, { weekStartsOn: 1 }), e = endOfWeek(now, { weekStartsOn: 1 });
    return payments.filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e })).reduce((a, p) => a + p.amount, 0);
  }, [payments]);
  const thisMonth = useMemo(() => {
    const s = startOfMonth(now), e = endOfMonth(now);
    return payments.filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e })).reduce((a, p) => a + p.amount, 0);
  }, [payments]);

  // 12-month earning trend
  const trend12 = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const ref = subMonths(new Date(), 11 - i);
      const s = startOfMonth(ref), e = endOfMonth(ref);
      const sum = payments.filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e })).reduce((a, p) => a + p.amount, 0);
      return { month: format(ref, "MMM"), amount: sum };
    });
  }, [payments]);

  const trendDelta = useMemo(() => {
    const last = trend12[trend12.length - 1]?.amount ?? 0;
    const prev = trend12[trend12.length - 2]?.amount ?? 0;
    if (prev === 0) return { pct: last > 0 ? 100 : 0, up: last >= 0 };
    const pct = Math.round(((last - prev) / prev) * 100);
    return { pct: Math.abs(pct), up: pct >= 0 };
  }, [trend12]);

  // Mode split (lifetime)
  const modeSplit = useMemo(() => {
    const m: Record<string, number> = { gpay: 0, cash: 0, other: 0 };
    payments.forEach((p) => { m[p.mode ?? "other"] = (m[p.mode ?? "other"] ?? 0) + p.amount; });
    return m;
  }, [payments]);

  // KPI extras (lifetime)
  const kpis = useMemo(() => {
    const count = payments.length;
    const avg = count ? lifetime / count : 0;
    const uniqueCustomers = new Set(payments.map((p) => p.customerId)).size;
    // Best month from trend12
    const best = trend12.reduce((a, b) => (b.amount > (a?.amount ?? 0) ? b : a), null as null | { month: string; amount: number });
    return { count, avg, uniqueCustomers, bestMonth: best };
  }, [payments, lifetime, trend12]);

  // Top 5 customers by lifetime paid
  const topCustomers = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((p) => map.set(p.customerId, (map.get(p.customerId) ?? 0) + p.amount));
    return Array.from(map.entries())
      .map(([cid, amount]) => ({ c: customers.find((x) => x.id === cid), amount }))
      .filter((r) => r.c)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [payments, customers]);

  // Recent payments (latest 8)
  const recent = useMemo(() => {
    return [...payments]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8)
      .map((p) => ({
        p,
        c: customers.find((x) => x.id === p.customerId),
        b: bookings.find((x) => x.id === p.bookingId),
      }));
  }, [payments, customers, bookings]);

  // ========= Exports (lifetime) =========
  const downloadBlob = (data: BlobPart, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const csvEscape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const exportCSV = () => {
    const header = ["Date", "Customer", "Phone", "Booking", "Service", "Mode", "Amount", "Note"];
    const rows = [...payments]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((p) => {
        const c = customers.find((x) => x.id === p.customerId);
        const b = bookings.find((x) => x.id === p.bookingId);
        return [
          format(parseISO(p.date), "yyyy-MM-dd HH:mm"),
          c?.name ?? "Unknown", c?.phone ?? "",
          b?.billNumber ?? b?.id ?? "", b?.service ?? "",
          p.mode ?? "other", p.amount, p.note ?? "",
        ];
      });
    rows.push(["TOTAL", "", "", "", "", "", lifetime, ""]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    downloadBlob(csv, `payments-lifetime.csv`, "text/csv;charset=utf-8");
    setExportOpen(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text(businessName || "Payments Report", 40, 50);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Lifetime Report`, 40, 68);
    doc.text(`Generated: ${format(new Date(), "PPp")}`, 40, 82);

    doc.setDrawColor(220); doc.roundedRect(40, 96, w - 80, 70, 6, 6);
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text("LIFETIME COLLECTED", 56, 116); doc.text("PENDING", 220, 116);
    doc.text("BILLED", 344, 116); doc.text("COLLECTION %", 470, 116);
    doc.setFontSize(13); doc.setTextColor(0); doc.setFont("helvetica", "bold");
    doc.text(rs(lifetime), 56, 138);
    doc.text(rs(totalPending), 220, 138);
    doc.text(rs(totalBilled), 344, 138);
    doc.text(`${collectionRate}%`, 470, 138);

    autoTable(doc, {
      startY: 184,
      head: [["Date", "Customer", "Booking", "Mode", "Amount"]],
      body: [...payments].sort((a, b) => b.date.localeCompare(a.date)).map((p) => {
        const c = customers.find((x) => x.id === p.customerId);
        const b = bookings.find((x) => x.id === p.bookingId);
        return [
          format(parseISO(p.date), "dd MMM yy, HH:mm"),
          c?.name ?? "Unknown",
          (b?.billNumber ?? "").split("-").pop() || "—",
          (p.mode ?? "other").toUpperCase(),
          rs(p.amount),
        ];
      }),
      foot: [["", "", "", "TOTAL", rs(lifetime)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [80, 30, 50], textColor: 255 },
      footStyles: { fillColor: [240, 235, 230], textColor: 0, fontStyle: "bold" },
    });

    doc.save(`payments-lifetime.pdf`);
    setExportOpen(false);
  };

  return (
    <AppShell title="Payments">
      {/* === LIFETIME HERO — always on top === */}
      <div className="relative overflow-hidden rounded-3xl p-5 text-primary-foreground bg-gradient-to-br from-primary via-primary to-accent card-shadow mb-3">
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-6 -bottom-10 size-32 rounded-full bg-white/5 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold opacity-90">
              <Sparkles className="size-3.5" /> Total collection
            </div>
            <div className="relative">
              <button
                onClick={() => setExportOpen((v) => !v)}
                className="size-9 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 transition"
                aria-label="Export"
              ><Download className="size-4" /></button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 top-11 z-40 bg-card card-shadow rounded-2xl p-1.5 min-w-[160px] border border-border text-foreground">
                    <button onClick={exportCSV} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-secondary text-left">
                      <FileText className="size-4 text-success" /> Export CSV
                    </button>
                    <button onClick={exportPDF} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-secondary text-left">
                      <FileText className="size-4 text-destructive" /> Export PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="font-display font-bold text-4xl mt-1.5 tabular-nums">{fmtINR(lifetime)}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] opacity-95">
            <span className="flex items-center gap-1">
              {trendDelta.up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {trendDelta.pct}% vs last month
            </span>
            <span>·</span>
            <span>{payments.length} payments</span>
          </div>

          {/* mini-period chips inside hero */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <MiniChip label="Today" value={fmtINR(today)} />
            <MiniChip label="This week" value={fmtINR(thisWeek)} />
            <MiniChip label="This month" value={fmtINR(thisMonth)} />
          </div>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat tint="success" icon={<Wallet className="size-3.5" />} label="Collected" value={fmtINR(lifetime)} />
        <Stat tint="danger" icon={<AlertCircle className="size-3.5" />} label="Pending" value={fmtINR(totalPending)} />
        <Stat tint="primary" icon={<TrendingUp className="size-3.5" />} label="Billed" value={fmtINR(totalBilled)} />
        <Stat tint="muted" icon={<IndianRupee className="size-3.5" />} label="Collection %" value={`${collectionRate}%`} />
      </div>

      {/* 12-month earnings area chart */}
      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Earnings trend</p>
            <p className="text-[10px] text-muted-foreground">Last 12 months</p>
          </div>
          <p className="text-sm font-bold tabular-nums">{fmtINR(trend12.reduce((s, m) => s + m.amount, 0))}</p>
        </div>
        <div className="h-44 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend12} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
              <YAxis hide />
              <Tooltip
                cursor={{ stroke: "var(--color-primary)", strokeOpacity: 0.3 }}
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [fmtINR(v), "Earned"]}
              />
              <Area type="monotone" dataKey="amount" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#earnGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <KpiCard icon={<CalendarCheck className="size-3.5" />} label="Payments" value={String(kpis.count)} sub={`avg ${fmtINR(kpis.avg)}`} tint="primary" />
        <KpiCard icon={<Users className="size-3.5" />} label="Unique customers" value={String(kpis.uniqueCustomers)} sub="all time" tint="accent" />
        <KpiCard icon={<TrendingUp className="size-3.5" />} label="Best month" value={kpis.bestMonth ? fmtINR(kpis.bestMonth.amount) : "—"} sub={kpis.bestMonth?.month ?? "—"} tint="success" />
        <KpiCard icon={<Crown className="size-3.5" />} label="Top customer" value={topCustomers[0] ? fmtINR(topCustomers[0].amount) : "—"} sub={topCustomers[0]?.c?.name ?? "—"} tint="gold" />
      </div>

      {/* Paid vs Pending bar (lifetime) */}
      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Paid vs Pending</p>
          <p className="text-[11px] font-bold tabular-nums">{collectionRate}%</p>
        </div>
        <div className="h-3 rounded-full overflow-hidden bg-secondary flex">
          <div className="bg-success h-full" style={{ width: `${collectionRate}%` }} />
          <div className="bg-destructive/60 h-full" style={{ width: `${100 - collectionRate}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>Paid <span className="font-bold text-success tabular-nums">{fmtINR(lifetime)}</span></span>
          <span>Pending <span className="font-bold text-destructive tabular-nums">{fmtINR(totalPending)}</span></span>
        </div>
      </div>

      {/* Mode split */}
      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Payment mode split</p>
        <div className="grid grid-cols-3 gap-2">
          {(["gpay", "cash", "other"] as const).map((m) => {
            const pct = lifetime > 0 ? Math.round((modeSplit[m] / lifetime) * 100) : 0;
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

      {/* Top customers */}
      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Top customers</p>
          <Crown className="size-3.5 text-gold" />
        </div>
        {topCustomers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No payments yet</p>
        ) : (
          <ul className="space-y-1.5">
            {topCustomers.map((r, i) => (
              <li key={r.c!.id}>
                <Link to="/customers/$id" params={{ id: r.c!.id }} className="flex items-center gap-2 p-2 -mx-1 rounded-xl active:bg-secondary">
                  <div className={cn(
                    "size-7 rounded-full flex items-center justify-center text-[11px] font-bold",
                    i === 0 ? "bg-gold/20 text-gold" : i === 1 ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground"
                  )}>{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{r.c!.name}</p>
                    <p className="text-[10px] text-muted-foreground">{r.c!.phone}</p>
                  </div>
                  <p className="font-bold text-sm tabular-nums text-success">{fmtINR(r.amount)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Monthly bars */}
      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Monthly collection</p>
        <div className="h-36">
          {trend12.every((m) => m.amount === 0) ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend12} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
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

      {/* Recent payments */}
      <div className="bg-card card-shadow rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Recent payments</p>
          <span className="text-[10px] text-muted-foreground">last {recent.length}</span>
        </div>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No payments yet</p>
        ) : (
          <ul className="space-y-1.5">
            {recent.map(({ p, c, b }) => (
              <li key={p.id} className="flex items-center gap-2 p-1.5 rounded-xl">
                <div className={cn(
                  "shrink-0 size-9 rounded-xl flex items-center justify-center text-[9px] font-bold uppercase",
                  p.mode === "gpay" ? "bg-[oklch(0.92_0.08_240)] text-[oklch(0.4_0.18_240)]"
                    : p.mode === "cash" ? "bg-[oklch(0.92_0.1_140)] text-[oklch(0.35_0.15_140)]"
                    : "bg-muted text-muted-foreground",
                )}>{(p.mode ?? "other").slice(0, 4)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{c?.name ?? "Unknown"}</p>
                    <p className="font-bold tabular-nums text-sm text-success">{fmtINR(p.amount)}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {format(parseISO(p.date), "MMM d · h:mm a")}
                    {b ? ` · ${b.service}` : ""}
                  </p>
                </div>
                {b && (
                  <Link to="/bookings/$id" params={{ id: b.id }} className="shrink-0 text-primary">
                    <ArrowRight className="size-4" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function MiniChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 backdrop-blur rounded-xl px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wider opacity-80 font-semibold">{label}</p>
      <p className="text-xs font-bold tabular-nums mt-0.5 truncate">{value}</p>
    </div>
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

function KpiCard({ icon, label, value, sub, tint }: { icon: React.ReactNode; label: string; value: string; sub: string; tint: "primary" | "success" | "accent" | "gold" }) {
  const tintCls =
    tint === "primary" ? "text-primary"
    : tint === "success" ? "text-success"
    : tint === "gold" ? "text-gold"
    : "text-accent-foreground";
  return (
    <div className="bg-card card-shadow rounded-2xl p-3">
      <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold ${tintCls}`}>
        {icon}<span className="truncate">{label}</span>
      </div>
      <p className="text-base font-display font-bold mt-1 tabular-nums truncate">{value}</p>
      <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
    </div>
  );
}
