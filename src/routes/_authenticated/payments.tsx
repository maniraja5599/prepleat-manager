import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, fmtINR, totalDue, type PaymentMode } from "@/lib/store";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { IndianRupee, TrendingUp, AlertCircle, Wallet, Download, FileText, Sparkles, TrendingDown, Users, Crown, CalendarCheck, ArrowRight, Plus, Trash2, Receipt, PieChart, Tag, X } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, AreaChart, Area, CartesianGrid } from "recharts";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Eyas Saree Drapist" },
      { name: "description", content: "Lifetime income, expenses by category, net profit analytics." },
    ],
  }),
  component: PaymentsPage,
});

const rs = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");

type TabId = "income" | "expenses" | "summary";

function PaymentsPage() {
  const payments = useStore((s) => s.payments);
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const expenses = useStore((s) => s.expenses);
  const extraIncomes = useStore((s) => s.extraIncomes);
  const settings = useStore((s) => s.settings);
  const businessName = settings.businessName;
  const categories = settings.expenseCategories ?? [];
  const incomeCats = settings.incomeCategories ?? [];

  const addExpense = useStore((s) => s.addExpense);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const addExtraIncome = useStore((s) => s.addExtraIncome);
  const deleteExtraIncome = useStore((s) => s.deleteExtraIncome);

  const [tab, setTab] = useState<TabId>("income");
  const [exportOpen, setExportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addIncomeOpen, setAddIncomeOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ type: "expense" | "income"; id: string } | null>(null);

  // === Lifetime ===
  const paymentsTotal = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const extraTotal = useMemo(() => extraIncomes.reduce((s, e) => s + e.amount, 0), [extraIncomes]);
  const lifetime = paymentsTotal + extraTotal;
  const totalExpense = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const netProfit = lifetime - totalExpense;
  const totalPending = useMemo(() => bookings.reduce((s, b) => s + totalDue(b), 0), [bookings]);
  const totalBilled = useMemo(() => bookings.reduce((s, b) => s + b.totalAmount, 0), [bookings]);
  const collectionRate = totalBilled > 0 ? Math.min(100, Math.round((paymentsTotal / totalBilled) * 100)) : 0;

  const now = new Date();
  const incomeIn = (s: Date, e: Date) => {
    const a = payments.filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e })).reduce((a, p) => a + p.amount, 0);
    const b = extraIncomes.filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e })).reduce((a, p) => a + p.amount, 0);
    return a + b;
  };
  const expenseIn = (s: Date, e: Date) =>
    expenses.filter((x) => isWithinInterval(parseISO(x.date), { start: s, end: e })).reduce((a, x) => a + x.amount, 0);

  const today = incomeIn(startOfDay(now), endOfDay(now));
  const thisWeek = incomeIn(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }));
  const thisMonth = incomeIn(startOfMonth(now), endOfMonth(now));

  const expToday = expenseIn(startOfDay(now), endOfDay(now));
  const expWeek = expenseIn(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }));
  const expMonth = expenseIn(startOfMonth(now), endOfMonth(now));

  // 12-month trends
  const trend12 = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const ref = subMonths(new Date(), 11 - i);
      const s = startOfMonth(ref), e = endOfMonth(ref);
      const inc = payments.filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e })).reduce((a, p) => a + p.amount, 0)
        + extraIncomes.filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e })).reduce((a, p) => a + p.amount, 0);
      const exp = expenses.filter((x) => isWithinInterval(parseISO(x.date), { start: s, end: e })).reduce((a, x) => a + x.amount, 0);
      return { month: format(ref, "MMM"), amount: inc, expense: exp, net: inc - exp };
    });
  }, [payments, extraIncomes, expenses]);

  const trendDelta = useMemo(() => {
    const last = trend12[trend12.length - 1]?.amount ?? 0;
    const prev = trend12[trend12.length - 2]?.amount ?? 0;
    if (prev === 0) return { pct: last > 0 ? 100 : 0, up: last >= 0 };
    const pct = Math.round(((last - prev) / prev) * 100);
    return { pct: Math.abs(pct), up: pct >= 0 };
  }, [trend12]);

  const modeSplit = useMemo(() => {
    const m: Record<string, number> = { gpay: 0, cash: 0, other: 0 };
    payments.forEach((p) => { m[p.mode ?? "other"] = (m[p.mode ?? "other"] ?? 0) + p.amount; });
    return m;
  }, [payments]);

  // Expense by category (lifetime)
  const expenseByCategory = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.amount));
    return Array.from(m.entries())
      .map(([cat, amount]) => ({ cat, amount, pct: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, totalExpense]);

  // Extra income by category (lifetime)
  const extraByCategory = useMemo(() => {
    const m = new Map<string, number>();
    extraIncomes.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.amount));
    return Array.from(m.entries())
      .map(([cat, amount]) => ({ cat, amount, pct: extraTotal > 0 ? Math.round((amount / extraTotal) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [extraIncomes, extraTotal]);

  const recentExtra = useMemo(
    () => [...extraIncomes].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [extraIncomes],
  );

  const kpis = useMemo(() => {
    const count = payments.length;
    const avg = count ? lifetime / count : 0;
    const uniqueCustomers = new Set(payments.map((p) => p.customerId)).size;
    const best = trend12.reduce((a, b) => (b.amount > (a?.amount ?? 0) ? b : a), null as null | { month: string; amount: number });
    return { count, avg, uniqueCustomers, bestMonth: best };
  }, [payments, lifetime, trend12]);

  const topCustomers = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((p) => map.set(p.customerId, (map.get(p.customerId) ?? 0) + p.amount));
    return Array.from(map.entries())
      .map(([cid, amount]) => ({ c: customers.find((x) => x.id === cid), amount }))
      .filter((r) => r.c)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [payments, customers]);

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

  const recentExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  }, [expenses]);

  // Exports
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
    const rows: (string | number)[][] = [];
    rows.push(["INCOME"]);
    rows.push(["Date", "Customer", "Phone", "Booking", "Service", "Mode", "Amount", "Note"]);
    [...payments].sort((a, b) => b.date.localeCompare(a.date)).forEach((p) => {
      const c = customers.find((x) => x.id === p.customerId);
      const b = bookings.find((x) => x.id === p.bookingId);
      rows.push([format(parseISO(p.date), "yyyy-MM-dd HH:mm"), c?.name ?? "Unknown", c?.phone ?? "", b?.billNumber ?? "", b?.service ?? "", p.mode ?? "other", p.amount, p.note ?? ""]);
    });
    rows.push(["TOTAL INCOME", "", "", "", "", "", lifetime, ""]);
    rows.push([]);
    rows.push(["EXPENSES"]);
    rows.push(["Date", "Category", "Mode", "Amount", "Note"]);
    [...expenses].sort((a, b) => b.date.localeCompare(a.date)).forEach((e) => {
      rows.push([format(parseISO(e.date), "yyyy-MM-dd HH:mm"), e.category, e.mode ?? "", e.amount, e.note ?? ""]);
    });
    rows.push(["TOTAL EXPENSE", "", "", totalExpense, ""]);
    rows.push([]);
    rows.push(["NET PROFIT", "", "", netProfit, ""]);
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
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
    doc.text("INCOME", 56, 116); doc.text("EXPENSE", 200, 116);
    doc.text("NET PROFIT", 344, 116); doc.text("COLLECTION %", 470, 116);
    doc.setFontSize(13); doc.setTextColor(0); doc.setFont("helvetica", "bold");
    doc.text(rs(lifetime), 56, 138);
    doc.text(rs(totalExpense), 200, 138);
    doc.text(rs(netProfit), 344, 138);
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
      foot: [["", "", "", "INCOME", rs(lifetime)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [80, 30, 50], textColor: 255 },
      footStyles: { fillColor: [240, 235, 230], textColor: 0, fontStyle: "bold" },
    });

    if (expenses.length > 0) {
      autoTable(doc, {
        head: [["Date", "Category", "Mode", "Note", "Amount"]],
        body: [...expenses].sort((a, b) => b.date.localeCompare(a.date)).map((e) => [
          format(parseISO(e.date), "dd MMM yy"),
          e.category,
          (e.mode ?? "—").toUpperCase(),
          e.note ?? "",
          rs(e.amount),
        ]),
        foot: [["", "", "", "EXPENSE", rs(totalExpense)], ["", "", "", "NET", rs(netProfit)]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [120, 50, 40], textColor: 255 },
        footStyles: { fillColor: [240, 230, 230], textColor: 0, fontStyle: "bold" },
      });
    }

    doc.save(`payments-lifetime.pdf`);
    setExportOpen(false);
  };

  return (
    <AppShell title="Payments">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl p-5 text-primary-foreground bg-gradient-to-br from-primary via-primary to-accent card-shadow mb-3">
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-6 -bottom-10 size-32 rounded-full bg-white/5 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold opacity-90">
              <Sparkles className="size-3.5" /> {tab === "expenses" ? "Total expenses" : tab === "summary" ? "Net profit" : "Total collection"}
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
          <p className="font-display font-bold text-4xl mt-1.5 tabular-nums">
            {tab === "expenses" ? fmtINR(totalExpense) : tab === "summary" ? fmtINR(netProfit) : fmtINR(lifetime)}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[11px] opacity-95">
            {tab === "income" && (
              <>
                <span className="flex items-center gap-1">
                  {trendDelta.up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {trendDelta.pct}% vs last month
                </span>
                <span>·</span>
                <span>{payments.length} payments</span>
              </>
            )}
            {tab === "expenses" && (
              <>
                <span>{expenses.length} entries</span>
                <span>·</span>
                <span>{expenseByCategory.length} categories</span>
              </>
            )}
            {tab === "summary" && (
              <>
                <span>Income {fmtINR(lifetime)}</span>
                <span>·</span>
                <span>Expense {fmtINR(totalExpense)}</span>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            {tab === "expenses" ? (
              <>
                <MiniChip label="Today" value={fmtINR(expToday)} />
                <MiniChip label="This week" value={fmtINR(expWeek)} />
                <MiniChip label="This month" value={fmtINR(expMonth)} />
              </>
            ) : (
              <>
                <MiniChip label="Today" value={fmtINR(today)} />
                <MiniChip label="This week" value={fmtINR(thisWeek)} />
                <MiniChip label="This month" value={fmtINR(thisMonth)} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="bg-card card-shadow rounded-full p-1 mb-3 grid grid-cols-3 gap-1 sticky top-2 z-20">
        {([
          { id: "income", label: "Income", icon: Wallet },
          { id: "expenses", label: "Expenses", icon: Receipt },
          { id: "summary", label: "Summary", icon: PieChart },
        ] as const).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition",
                active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground",
              )}
            >
              <Icon className="size-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "income" && (
        <IncomeView
          lifetime={lifetime} totalPending={totalPending} totalBilled={totalBilled} collectionRate={collectionRate}
          trend12={trend12} kpis={kpis} topCustomers={topCustomers} modeSplit={modeSplit} recent={recent}
          extraTotal={extraTotal} extraByCategory={extraByCategory} recentExtra={recentExtra}
          onDeleteExtra={(id) => setPendingDelete({ type: "income", id })}
        />
      )}

      {tab === "expenses" && (
        <ExpensesView
          expenses={expenses} totalExpense={totalExpense} categories={categories}
          expenseByCategory={expenseByCategory} trend12={trend12} recentExpenses={recentExpenses}
          onAdd={() => setAddOpen(true)} onDelete={(id) => setPendingDelete({ type: "expense", id })}
        />
      )}

      {tab === "summary" && (
        <SummaryView
          lifetime={lifetime} totalExpense={totalExpense} netProfit={netProfit}
          totalPending={totalPending} totalBilled={totalBilled} collectionRate={collectionRate}
          trend12={trend12} expenseByCategory={expenseByCategory}
        />
      )}

      {/* FAB add (expenses → expense, income → extra income) */}
      {tab === "expenses" && (
        <button
          onClick={() => setAddOpen(true)}
          className="fixed bottom-24 right-4 z-30 size-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center"
          aria-label="Add expense"
        ><Plus className="size-6" /></button>
      )}
      {tab === "income" && (
        <button
          onClick={() => setAddIncomeOpen(true)}
          className="fixed bottom-24 right-4 z-30 size-14 rounded-full bg-success text-white shadow-xl flex items-center justify-center"
          aria-label="Add extra income"
        ><Plus className="size-6" /></button>
      )}

      {addOpen && (
        <AddExpenseSheet
          categories={categories}
          defaultMode={settings.defaultPaymentMode ?? "gpay"}
          modes={settings.paymentModes ?? ["gpay","cash","other"]}
          onClose={() => setAddOpen(false)}
          onSave={(payload) => {
            addExpense(payload);
            toast.success("Expense added", { duration: 1500 });
            setAddOpen(false);
          }}
        />
      )}

      {addIncomeOpen && (
        <AddIncomeSheet
          categories={incomeCats}
          defaultMode={settings.defaultPaymentMode ?? "gpay"}
          modes={settings.paymentModes ?? ["gpay","cash","other"]}
          onClose={() => setAddIncomeOpen(false)}
          onSave={(payload) => {
            addExtraIncome(payload);
            toast.success("Income added", { duration: 1500 });
            setAddIncomeOpen(false);
          }}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title={pendingDelete?.type === "income" ? "Delete this income entry?" : "Delete this expense?"}
        description="This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (!pendingDelete) return;
          if (pendingDelete.type === "income") {
            deleteExtraIncome(pendingDelete.id);
            toast.success("Income removed");
          } else {
            deleteExpense(pendingDelete.id);
            toast.success("Expense removed");
          }
          setPendingDelete(null);
        }}
      />
    </AppShell>
  );
}

// === Income tab ===
function IncomeView(p: {
  lifetime: number; totalPending: number; totalBilled: number; collectionRate: number;
  trend12: { month: string; amount: number }[];
  kpis: { count: number; avg: number; uniqueCustomers: number; bestMonth: { month: string; amount: number } | null };
  topCustomers: { c: any; amount: number }[];
  modeSplit: Record<string, number>;
  recent: { p: any; c: any; b: any }[];
  extraTotal: number;
  extraByCategory: { cat: string; amount: number; pct: number }[];
  recentExtra: { id: string; amount: number; category: string; note?: string; date: string; mode?: PaymentMode }[];
  onDeleteExtra: (id: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat tint="success" icon={<Wallet className="size-3.5" />} label="Collected" value={fmtINR(p.lifetime)} />
        <Stat tint="danger" icon={<AlertCircle className="size-3.5" />} label="Pending" value={fmtINR(p.totalPending)} />
        <Stat tint="primary" icon={<TrendingUp className="size-3.5" />} label="Billed" value={fmtINR(p.totalBilled)} />
        <Stat tint="muted" icon={<IndianRupee className="size-3.5" />} label="Collection %" value={`${p.collectionRate}%`} />
      </div>

      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Earnings trend</p>
            <p className="text-[10px] text-muted-foreground">Last 12 months</p>
          </div>
          <p className="text-sm font-bold tabular-nums">{fmtINR(p.trend12.reduce((s, m) => s + m.amount, 0))}</p>
        </div>
        <div className="h-44 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={p.trend12} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
              <YAxis hide />
              <Tooltip cursor={{ stroke: "var(--color-primary)", strokeOpacity: 0.3 }}
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [fmtINR(v), "Earned"]} />
              <Area type="monotone" dataKey="amount" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#earnGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <KpiCard icon={<CalendarCheck className="size-3.5" />} label="Payments" value={String(p.kpis.count)} sub={`avg ${fmtINR(p.kpis.avg)}`} tint="primary" />
        <KpiCard icon={<Users className="size-3.5" />} label="Unique customers" value={String(p.kpis.uniqueCustomers)} sub="all time" tint="accent" />
        <KpiCard icon={<TrendingUp className="size-3.5" />} label="Best month" value={p.kpis.bestMonth ? fmtINR(p.kpis.bestMonth.amount) : "—"} sub={p.kpis.bestMonth?.month ?? "—"} tint="success" />
        <KpiCard icon={<Crown className="size-3.5" />} label="Top customer" value={p.topCustomers[0] ? fmtINR(p.topCustomers[0].amount) : "—"} sub={p.topCustomers[0]?.c?.name ?? "—"} tint="gold" />
      </div>

      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Payment mode split</p>
        <div className="grid grid-cols-3 gap-2">
          {(["gpay", "cash", "other"] as const).map((m) => {
            const pct = p.lifetime > 0 ? Math.round((p.modeSplit[m] / p.lifetime) * 100) : 0;
            return (
              <div key={m} className="bg-secondary rounded-xl p-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{m}</p>
                <p className="font-bold tabular-nums text-sm mt-0.5">{fmtINR(p.modeSplit[m])}</p>
                <p className="text-[10px] text-muted-foreground tabular-nums">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Top customers</p>
          <Crown className="size-3.5 text-gold" />
        </div>
        {p.topCustomers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No payments yet</p>
        ) : (
          <ul className="space-y-1.5">
            {p.topCustomers.map((r, i) => (
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

      <div className="bg-card card-shadow rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Recent payments</p>
          <span className="text-[10px] text-muted-foreground">last {p.recent.length}</span>
        </div>
        {p.recent.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No payments yet</p>
        ) : (
          <ul className="space-y-1.5">
            {p.recent.map(({ p: pay, c, b }) => (
              <li key={pay.id} className="flex items-center gap-2 p-1.5 rounded-xl">
                <div className={cn(
                  "shrink-0 size-9 rounded-xl flex items-center justify-center text-[9px] font-bold uppercase",
                  pay.mode === "gpay" ? "bg-[oklch(0.92_0.08_240)] text-[oklch(0.4_0.18_240)]"
                    : pay.mode === "cash" ? "bg-[oklch(0.92_0.1_140)] text-[oklch(0.35_0.15_140)]"
                    : "bg-muted text-muted-foreground",
                )}>{(pay.mode ?? "other").slice(0, 4)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{c?.name ?? "Unknown"}</p>
                    <p className="font-bold tabular-nums text-sm text-success">{fmtINR(pay.amount)}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {format(parseISO(pay.date), "MMM d · h:mm a")}{b ? ` · ${b.service}` : ""}
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

      {/* Extra income */}
      <div className="bg-card card-shadow rounded-2xl p-3 mt-3 mb-20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Extra income</p>
            <p className="text-[10px] text-muted-foreground">Not tied to bookings · tap + below to add</p>
          </div>
          <p className="text-sm font-bold tabular-nums text-success">{fmtINR(p.extraTotal)}</p>
        </div>
        {p.extraByCategory.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No extra income yet</p>
        ) : (
          <>
            <ul className="space-y-1.5 mb-3">
              {p.extraByCategory.map((row, i) => (
                <li key={row.cat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold flex items-center gap-1.5">
                      <span className={cn(
                        "size-2 rounded-full",
                        i === 0 ? "bg-success" : i === 1 ? "bg-primary" : "bg-accent",
                      )} />
                      {row.cat}
                    </span>
                    <span className="tabular-nums font-bold">{fmtINR(row.amount)} <span className="text-muted-foreground font-normal">· {row.pct}%</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className={cn("h-full", i === 0 ? "bg-success" : i === 1 ? "bg-primary" : "bg-accent")} style={{ width: `${row.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <ul className="space-y-1.5 pt-2 border-t border-border">
              {p.recentExtra.map((e) => (
                <li key={e.id} className="flex items-center gap-2 p-1.5 rounded-xl">
                  <div className="shrink-0 size-9 rounded-xl bg-success/15 text-success flex items-center justify-center">
                    <Plus className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{e.category}</p>
                      <p className="font-bold tabular-nums text-sm text-success">+{fmtINR(e.amount)}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {format(parseISO(e.date), "MMM d · h:mm a")}{e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                  <button onClick={() => p.onDeleteExtra(e.id)} className="shrink-0 size-8 rounded-full hover:bg-destructive/10 text-destructive flex items-center justify-center">
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

// === Expenses tab ===
function ExpensesView(p: {
  expenses: any[]; totalExpense: number; categories: string[];
  expenseByCategory: { cat: string; amount: number; pct: number }[];
  trend12: { month: string; expense: number }[];
  recentExpenses: any[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  if (p.categories.length === 0) {
    return (
      <div className="bg-card card-shadow rounded-2xl p-6 text-center">
        <Tag className="size-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-semibold mb-1">No expense categories yet</p>
        <p className="text-xs text-muted-foreground mb-3">Add categories in Settings → Pricing first.</p>
        <Link to="/settings" className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          Open Settings
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Category breakdown */}
      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">By category</p>
          <p className="text-sm font-bold tabular-nums text-destructive">{fmtINR(p.totalExpense)}</p>
        </div>
        {p.expenseByCategory.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No expenses logged yet. Tap + to add.</p>
        ) : (
          <ul className="space-y-2">
            {p.expenseByCategory.map((row, i) => (
              <li key={row.cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className={cn(
                      "size-2 rounded-full",
                      i === 0 ? "bg-destructive" : i === 1 ? "bg-primary" : i === 2 ? "bg-accent" : "bg-muted-foreground"
                    )} />
                    {row.cat}
                  </span>
                  <span className="tabular-nums font-bold">{fmtINR(row.amount)} <span className="text-muted-foreground font-normal">· {row.pct}%</span></span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className={cn(
                    "h-full",
                    i === 0 ? "bg-destructive" : i === 1 ? "bg-primary" : i === 2 ? "bg-accent" : "bg-muted-foreground"
                  )} style={{ width: `${row.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 12-month expense trend */}
      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Monthly expenses</p>
            <p className="text-[10px] text-muted-foreground">Last 12 months</p>
          </div>
        </div>
        <div className="h-36">
          {p.trend12.every((m) => m.expense === 0) ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={p.trend12} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <Tooltip cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [fmtINR(v), "Spent"]} />
                <Bar dataKey="expense" fill="var(--color-destructive)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent expenses */}
      <div className="bg-card card-shadow rounded-2xl p-3 mb-20">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Recent expenses</p>
          <span className="text-[10px] text-muted-foreground">last {p.recentExpenses.length}</span>
        </div>
        {p.recentExpenses.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No expenses yet</p>
        ) : (
          <ul className="space-y-1.5">
            {p.recentExpenses.map((e) => (
              <li key={e.id} className="flex items-center gap-2 p-1.5 rounded-xl">
                <div className="shrink-0 size-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                  <Receipt className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{e.category}</p>
                    <p className="font-bold tabular-nums text-sm text-destructive">−{fmtINR(e.amount)}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {format(parseISO(e.date), "MMM d · h:mm a")}{e.note ? ` · ${e.note}` : ""}
                  </p>
                </div>
                <button onClick={() => p.onDelete(e.id)} className="shrink-0 size-8 rounded-full hover:bg-destructive/10 text-destructive flex items-center justify-center">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

// === Summary tab ===
function SummaryView(p: {
  lifetime: number; totalExpense: number; netProfit: number;
  totalPending: number; totalBilled: number; collectionRate: number;
  trend12: { month: string; amount: number; expense: number; net: number }[];
  expenseByCategory: { cat: string; amount: number; pct: number }[];
}) {
  const margin = p.lifetime > 0 ? Math.round((p.netProfit / p.lifetime) * 100) : 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat tint="success" icon={<Wallet className="size-3.5" />} label="Income" value={fmtINR(p.lifetime)} />
        <Stat tint="danger" icon={<Receipt className="size-3.5" />} label="Expense" value={fmtINR(p.totalExpense)} />
        <Stat tint="primary" icon={<TrendingUp className="size-3.5" />} label="Net profit" value={fmtINR(p.netProfit)} />
        <Stat tint="muted" icon={<IndianRupee className="size-3.5" />} label="Margin" value={`${margin}%`} />
      </div>

      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Income vs Expense (12 months)</p>
        <div className="h-44 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={p.trend12} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number, name: string) => [fmtINR(v), name === "amount" ? "Income" : name === "expense" ? "Expense" : "Net"]} />
              <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Collection</p>
          <p className="text-[11px] font-bold tabular-nums">{p.collectionRate}%</p>
        </div>
        <div className="h-3 rounded-full overflow-hidden bg-secondary flex">
          <div className="bg-success h-full" style={{ width: `${p.collectionRate}%` }} />
          <div className="bg-destructive/60 h-full" style={{ width: `${100 - p.collectionRate}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>Paid <span className="font-bold text-success tabular-nums">{fmtINR(p.lifetime)}</span></span>
          <span>Pending <span className="font-bold text-destructive tabular-nums">{fmtINR(p.totalPending)}</span></span>
        </div>
      </div>

      {p.expenseByCategory.length > 0 && (
        <div className="bg-card card-shadow rounded-2xl p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Expense breakdown</p>
          <ul className="space-y-1.5">
            {p.expenseByCategory.map((row) => (
              <li key={row.cat} className="flex items-center justify-between text-xs">
                <span className="font-medium">{row.cat}</span>
                <span className="tabular-nums font-bold">{fmtINR(row.amount)} <span className="text-muted-foreground font-normal">· {row.pct}%</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// === Add expense sheet ===
function AddExpenseSheet({
  categories, defaultMode, modes, onClose, onSave,
}: {
  categories: string[];
  defaultMode: PaymentMode;
  modes: string[];
  onClose: () => void;
  onSave: (p: { amount: number; category: string; note?: string; date: string; mode: PaymentMode }) => void;
}) {
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>(categories[0] ?? "Other");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<PaymentMode>(defaultMode);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!category) return toast.error("Pick a category");
    const iso = new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
    onSave({ amount: amt, category, note: note.trim() || undefined, date: iso, mode });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-4 pb-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-lg">Add expense</h3>
          <button onClick={onClose} className="size-8 rounded-full bg-secondary flex items-center justify-center"><X className="size-4" /></button>
        </div>

        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Amount</label>
        <div className="flex items-center gap-2 bg-secondary rounded-2xl px-3 py-3 mt-1 mb-3">
          <IndianRupee className="size-5 text-muted-foreground" />
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="bg-transparent flex-1 text-2xl font-bold tabular-nums focus:outline-none"
          />
        </div>

        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Category</label>
        <div className="flex flex-wrap gap-1.5 mt-1 mb-3">
          {categories.map((c) => {
            const active = category === c;
            return (
              <button key={c} onClick={() => setCategory(c)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold", active ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                {c}
              </button>
            );
          })}
        </div>

        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-secondary rounded-2xl px-3 py-2.5 mt-1 mb-3 text-sm focus:outline-none"
        />

        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Mode</label>
        <div className="flex flex-wrap gap-2 mt-1 mb-3">
          {modes.map((m) => {
            const active = mode === m;
            return (
              <button key={m} onClick={() => setMode(m)}
                className={cn("px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider", active ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                {m}
              </button>
            );
          })}
        </div>

        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Note (optional)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Cloth purchase"
          className="w-full bg-secondary rounded-2xl px-3 py-2.5 mt-1 mb-4 text-sm focus:outline-none"
        />

        <button onClick={submit} className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold">
          Save expense
        </button>
      </div>
    </>
  );
}

function AddIncomeSheet({
  categories, defaultMode, modes, onClose, onSave,
}: {
  categories: string[];
  defaultMode: PaymentMode;
  modes: string[];
  onClose: () => void;
  onSave: (p: { amount: number; category: string; note?: string; date: string; mode: PaymentMode }) => void;
}) {
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>(categories[0] ?? "Other Income");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<PaymentMode>(defaultMode);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!category) return toast.error("Pick a category");
    const iso = new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
    onSave({ amount: amt, category, note: note.trim() || undefined, date: iso, mode });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-4 pb-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-lg">Add extra income</h3>
          <button onClick={onClose} className="size-9 rounded-full bg-secondary flex items-center justify-center"><X className="size-4" /></button>
        </div>

        {categories.length === 0 ? (
          <p className="text-xs text-muted-foreground mb-3">
            Add income categories in Settings → Headers first.
          </p>
        ) : null}

        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Amount</label>
        <div className="relative mt-1 mb-3">
          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="number" inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-secondary rounded-2xl pl-9 pr-3 py-3 text-lg font-bold tabular-nums focus:outline-none"
            autoFocus
          />
        </div>

        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Category</label>
        <div className="flex flex-wrap gap-1.5 mt-1 mb-3">
          {categories.map((c) => {
            const active = category === c;
            return (
              <button key={c} onClick={() => setCategory(c)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold", active ? "bg-success text-white" : "bg-secondary")}>{c}</button>
            );
          })}
        </div>

        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-secondary rounded-2xl px-3 py-2.5 mt-1 mb-3 text-sm focus:outline-none"
        />

        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Mode</label>
        <div className="flex flex-wrap gap-2 mt-1 mb-3">
          {modes.map((m) => {
            const active = mode === m;
            return (
              <button key={m} onClick={() => setMode(m)}
                className={cn("px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider", active ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                {m}
              </button>
            );
          })}
        </div>

        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Note (optional)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Tip from bride"
          className="w-full bg-secondary rounded-2xl px-3 py-2.5 mt-1 mb-4 text-sm focus:outline-none"
        />

        <button onClick={submit} className="w-full py-3 rounded-full bg-success text-white font-bold">
          Save income
        </button>
      </div>
    </>
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
