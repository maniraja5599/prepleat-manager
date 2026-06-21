import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, fmtINR, totalDue, formatAppDate, formatAppTime, formatAppDateTime, type PaymentMode } from "@/lib/store";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subMonths,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  IndianRupee,
  TrendingUp,
  AlertCircle,
  Wallet,
  Download,
  FileText,
  Sparkles,
  TrendingDown,
  Users,
  Crown,
  CalendarCheck,
  ArrowRight,
  Plus,
  Trash2,
  Receipt,
  PieChart,
  Tag,
  X,
  Phone,
  MessageCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
} from "recharts";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/payments")({
  validateSearch: (search: Record<string, unknown>): { filter?: "collected" | "pending" } => {
    return {
      filter: (search.filter as "collected" | "pending") || undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Payments — Eyas Saree Drapist" },
      {
        name: "description",
        content: "Lifetime income, expenses by category, net profit analytics.",
      },
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
  const restoreExpense = useStore((s) => s.restoreExpense);
  const addExtraIncome = useStore((s) => s.addExtraIncome);
  const deleteExtraIncome = useStore((s) => s.deleteExtraIncome);
  const restoreExtraIncome = useStore((s) => s.restoreExtraIncome);
  const updateExpense = useStore((s) => s.updateExpense);
  const updateExtraIncome = useStore((s) => s.updateExtraIncome);
  const updatePayment = useStore((s) => s.updatePayment);
  const deletePayment = useStore((s) => s.deletePayment);

  const { filter } = Route.useSearch();
  const [subFilter, setSubFilter] = useState<"collected" | "pending">(filter || "collected");
  const navigate = useNavigate();

  useEffect(() => {
    if (filter) {
      setSubFilter(filter);
      setTab("income");
    }
  }, [filter]);

  const handleSubFilterChange = (val: "collected" | "pending") => {
    setSubFilter(val);
    navigate({
      search: (prev) => ({ ...prev, filter: val }),
    });
  };

  const [tab, setTab] = useState<TabId>("summary");
  const [exportOpen, setExportOpen] = useState(false);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [addTransactionType, setAddTransactionType] = useState<"income" | "expense">("income");
  const [editingTx, setEditingTx] = useState<any>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    type: "expense" | "income" | "extra_income" | "booking_payment";
    id: string;
  } | null>(null);

  // === Lifetime ===
  const paymentsTotal = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const extraTotal = useMemo(() => extraIncomes.reduce((s, e) => s + e.amount, 0), [extraIncomes]);
  const lifetime = paymentsTotal + extraTotal;
  const totalExpense = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const netProfit = lifetime - totalExpense;
  const totalPending = useMemo(() => {
    const today = startOfDay(new Date());
    return bookings.reduce((s, b) => {
      if (b.status === "cancelled") return s;
      if (b.status === "completed" || new Date(b.deliveryDate) >= today) {
        return s + totalDue(b);
      }
      return s;
    }, 0);
  }, [bookings]);
  const totalBilled = useMemo(() => bookings.reduce((s, b) => s + b.totalAmount, 0), [bookings]);
  const collectionRate =
    totalBilled > 0 ? Math.min(100, Math.round((paymentsTotal / totalBilled) * 100)) : 0;

  const now = new Date();
  const incomeIn = (s: Date, e: Date) => {
    const a = payments
      .filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e }))
      .reduce((a, p) => a + p.amount, 0);
    const b = extraIncomes
      .filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e }))
      .reduce((a, p) => a + p.amount, 0);
    return a + b;
  };
  const expenseIn = (s: Date, e: Date) =>
    expenses
      .filter((x) => isWithinInterval(parseISO(x.date), { start: s, end: e }))
      .reduce((a, x) => a + x.amount, 0);

  const today = incomeIn(startOfDay(now), endOfDay(now));
  const thisWeek = incomeIn(
    startOfWeek(now, { weekStartsOn: 1 }),
    endOfWeek(now, { weekStartsOn: 1 }),
  );
  const thisMonth = incomeIn(startOfMonth(now), endOfMonth(now));

  const expToday = expenseIn(startOfDay(now), endOfDay(now));
  const expWeek = expenseIn(
    startOfWeek(now, { weekStartsOn: 1 }),
    endOfWeek(now, { weekStartsOn: 1 }),
  );
  const expMonth = expenseIn(startOfMonth(now), endOfMonth(now));

  // States for scrolling earnings/spend ticker
  const [earningIndex, setEarningIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setEarningIndex((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const tickerItems = useMemo(() => {
    if (tab === "expenses") {
      return [
        { label: "Today Spend", value: expToday, color: "text-destructive" },
        { label: "This Week", value: expWeek, color: "text-destructive" },
        { label: "This Month", value: expMonth, color: "text-destructive" },
      ];
    }
    return [
      { label: "Today Earning", value: today, color: "text-success" },
      { label: "This Week", value: thisWeek, color: "text-success" },
      { label: "This Month", value: thisMonth, color: "text-success" },
    ];
  }, [tab, today, thisWeek, thisMonth, expToday, expWeek, expMonth]);

  // 12-month trends
  const trend12 = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const ref = subMonths(new Date(), 11 - i);
      const s = startOfMonth(ref),
        e = endOfMonth(ref);
      const inc =
        payments
          .filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e }))
          .reduce((a, p) => a + p.amount, 0) +
        extraIncomes
          .filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e }))
          .reduce((a, p) => a + p.amount, 0);
      const exp = expenses
        .filter((x) => isWithinInterval(parseISO(x.date), { start: s, end: e }))
        .reduce((a, x) => a + x.amount, 0);
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
    payments.forEach((p) => {
      m[p.mode ?? "other"] = (m[p.mode ?? "other"] ?? 0) + p.amount;
    });
    return m;
  }, [payments]);

  // Expense by category (lifetime)
  const expenseByCategory = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.amount));
    return Array.from(m.entries())
      .map(([cat, amount]) => ({
        cat,
        amount,
        pct: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, totalExpense]);

  // Extra income by category (lifetime)
  const extraByCategory = useMemo(() => {
    const m = new Map<string, number>();
    extraIncomes.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.amount));
    return Array.from(m.entries())
      .map(([cat, amount]) => ({
        cat,
        amount,
        pct: extraTotal > 0 ? Math.round((amount / extraTotal) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [extraIncomes, extraTotal]);

  const recentExtra = useMemo(
    () => [...extraIncomes].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20),
    [extraIncomes],
  );

  const kpis = useMemo(() => {
    const count = payments.length;
    const avg = count ? lifetime / count : 0;
    const uniqueCustomers = new Set(payments.map((p) => p.customerId)).size;
    const best = trend12.reduce(
      (a, b) => (b.amount > (a?.amount ?? 0) ? b : a),
      null as null | { month: string; amount: number },
    );
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
      .slice(0, 25)
      .map((p) => ({
        p,
        c: customers.find((x) => x.id === p.customerId),
        b: bookings.find((x) => x.id === p.bookingId),
      }));
  }, [payments, customers, bookings]);

  const recentExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25);
  }, [expenses]);

  // Split total income by source (Services + Extra Income categories)
  const incomeByCategory = useMemo(() => {
    const m = new Map<string, number>();
    payments.forEach((p) => {
      const b = bookings.find((x) => x.id === p.bookingId);
      const key = b?.service ?? "Draping Service";
      m.set(key, (m.get(key) ?? 0) + p.amount);
    });
    extraIncomes.forEach((e) => {
      m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    });
    return Array.from(m.entries())
      .map(([cat, amount]) => ({
        cat,
        amount,
        pct: lifetime > 0 ? Math.round((amount / lifetime) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [payments, extraIncomes, bookings, lifetime]);

  // Chronological stream of recent transactions (Income + Expense combined)
  const unifiedRecentTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      type: "income" | "expense";
      sourceType: "booking_payment" | "extra_income" | "expense";
      amount: number;
      category: string;
      note?: string;
      date: string;
      mode?: PaymentMode;
      customerName?: string;
    }> = [];

    payments.forEach((p) => {
      const c = customers.find((x) => x.id === p.customerId);
      const b = bookings.find((x) => x.id === p.bookingId);
      list.push({
        id: p.id,
        type: "income",
        sourceType: "booking_payment",
        amount: p.amount,
        category: b?.service ?? "Booking Payment",
        note: p.note,
        date: p.date,
        mode: p.mode,
        customerName: c?.name,
      });
    });

    extraIncomes.forEach((e) => {
      list.push({
        id: e.id,
        type: "income",
        sourceType: "extra_income",
        amount: e.amount,
        category: e.category,
        note: e.note,
        date: e.date,
        mode: e.mode,
      });
    });

    expenses.forEach((e) => {
      list.push({
        id: e.id,
        type: "expense",
        sourceType: "expense",
        amount: e.amount,
        category: e.category,
        note: e.note,
        date: e.date,
        mode: e.mode as PaymentMode,
      });
    });

    return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);
  }, [payments, extraIncomes, expenses, customers, bookings]);

  // Chronological monthly groupings of income vs expense since day 1
  const allTimeTrend = useMemo(() => {
    const allDates = [
      ...payments.map((p) => p.date),
      ...extraIncomes.map((e) => e.date),
      ...expenses.map((x) => x.date),
    ].sort();

    if (allDates.length === 0) {
      return [];
    }

    const monthlyMap = new Map<string, { monthStr: string; amount: number; expense: number }>();

    payments.forEach((p) => {
      const d = parseISO(p.date);
      const key = format(d, "yyyy-MM");
      const current = monthlyMap.get(key) || {
        monthStr: format(d, "MMM yy"),
        amount: 0,
        expense: 0,
      };
      current.amount += p.amount;
      monthlyMap.set(key, current);
    });

    extraIncomes.forEach((e) => {
      const d = parseISO(e.date);
      const key = format(d, "yyyy-MM");
      const current = monthlyMap.get(key) || {
        monthStr: format(d, "MMM yy"),
        amount: 0,
        expense: 0,
      };
      current.amount += e.amount;
      monthlyMap.set(key, current);
    });

    expenses.forEach((x) => {
      const d = parseISO(x.date);
      const key = format(d, "yyyy-MM");
      const current = monthlyMap.get(key) || {
        monthStr: format(d, "MMM yy"),
        amount: 0,
        expense: 0,
      };
      current.expense += x.amount;
      monthlyMap.set(key, current);
    });

    return Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, v]) => ({
        month: v.monthStr,
        amount: v.amount,
        expense: v.expense,
        net: v.amount - v.expense,
      }));
  }, [payments, extraIncomes, expenses]);

  // Exports
  const downloadBlob = (data: BlobPart, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
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
    [...payments]
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((p) => {
        const c = customers.find((x) => x.id === p.customerId);
        const b = bookings.find((x) => x.id === p.bookingId);
        rows.push([
          format(parseISO(p.date), "yyyy-MM-dd HH:mm"),
          c?.name ?? "Unknown",
          c?.phone ?? "",
          b?.billNumber ?? "",
          b?.service ?? "",
          p.mode ?? "other",
          p.amount,
          p.note ?? "",
        ]);
      });
    rows.push(["TOTAL INCOME", "", "", "", "", "", lifetime, ""]);
    rows.push([]);
    rows.push(["EXPENSES"]);
    rows.push(["Date", "Category", "Mode", "Amount", "Note"]);
    [...expenses]
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((e) => {
        rows.push([
          format(parseISO(e.date), "yyyy-MM-dd HH:mm"),
          e.category,
          e.mode ?? "",
          e.amount,
          e.note ?? "",
        ]);
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(businessName || "Payments Report", 40, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Lifetime Report`, 40, 68);
    doc.text(`Generated: ${formatAppDateTime(new Date().toISOString())}`, 40, 82);

    doc.setDrawColor(220);
    doc.roundedRect(40, 96, w - 80, 70, 6, 6);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("INCOME", 56, 116);
    doc.text("EXPENSE", 200, 116);
    doc.text("NET PROFIT", 344, 116);
    doc.text("COLLECTION %", 470, 116);
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(rs(lifetime), 56, 138);
    doc.text(rs(totalExpense), 200, 138);
    doc.text(rs(netProfit), 344, 138);
    doc.text(`${collectionRate}%`, 470, 138);

    autoTable(doc, {
      startY: 184,
      head: [["Date", "Customer", "Booking", "Mode", "Amount"]],
      body: [...payments]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((p) => {
          const c = customers.find((x) => x.id === p.customerId);
          const b = bookings.find((x) => x.id === p.bookingId);
          return [
            formatAppDateTime(p.date),
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
        body: [...expenses]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((e) => [
            formatAppDate(e.date),
            e.category,
            (e.mode ?? "—").toUpperCase(),
            e.note ?? "",
            rs(e.amount),
          ]),
        foot: [
          ["", "", "", "EXPENSE", rs(totalExpense)],
          ["", "", "", "NET", rs(netProfit)],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [120, 50, 40], textColor: 255 },
        footStyles: { fillColor: [240, 230, 230], textColor: 0, fontStyle: "bold" },
      });
    }

    doc.save(`payments-lifetime.pdf`);
    setExportOpen(false);
  };

  return (
    <AppShell>
      {/* Sticky Header block (Title + Ticker + Tab Bar) */}
      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-20 bg-background/95 backdrop-blur-md -mx-5 px-5 pt-3 pb-2.5 border-b border-border/40 mb-4">
        <div className="flex items-center justify-between gap-4 h-9">
          <h1 className="text-xl font-display font-semibold tracking-tight text-foreground">
            Payments
          </h1>

          {/* Cute Vertical Scrolling Earning/Spend Ticker */}
          <div className="h-7 overflow-hidden relative min-w-[110px]">
            <div
              className="transition-transform duration-500 ease-in-out"
              style={{ transform: `translateY(-${earningIndex * 28}px)` }}
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

        {/* TAB BAR */}
        <div className="bg-card card-shadow rounded-full p-1 mt-2.5 grid grid-cols-3 gap-1">
          {(
            [
              { id: "summary", label: "Summary", icon: PieChart },
              { id: "income", label: "Income", icon: Wallet },
              { id: "expenses", label: "Expenses", icon: Receipt },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const animationClass =
              t.id === "income"
                ? "animate-pump-income"
                : t.id === "expenses"
                  ? "animate-pump-expense"
                  : "";
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95",
                  active
                    ? t.id === "income"
                      ? "bg-success text-white shadow"
                      : t.id === "expenses"
                        ? "bg-destructive text-white shadow"
                        : "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-secondary/40",
                )}
              >
                <Icon className={cn("size-3.5", animationClass)} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl p-5 text-primary-foreground bg-gradient-to-br from-primary via-primary to-accent card-shadow mb-3">
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-6 -bottom-10 size-32 rounded-full bg-white/5 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold opacity-90">
              <Sparkles className="size-3.5" />{" "}
              {tab === "expenses"
                ? "Total expenses"
                : tab === "summary"
                  ? "Net profit"
                  : "Total collection"}
            </div>
            <div className="relative">
              <button
                onClick={() => setExportOpen((v) => !v)}
                className="size-9 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 transition"
                aria-label="Export"
              >
                <Download className="size-4" />
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 top-11 z-40 bg-card card-shadow rounded-2xl p-1.5 min-w-[160px] border border-border text-foreground">
                    <button
                      onClick={exportCSV}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-secondary text-left"
                    >
                      <FileText className="size-4 text-success" /> Export CSV
                    </button>
                    <button
                      onClick={exportPDF}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-secondary text-left"
                    >
                      <FileText className="size-4 text-destructive" /> Export PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="font-display font-bold text-4xl mt-1.5 tabular-nums">
            {tab === "expenses"
              ? fmtINR(totalExpense)
              : tab === "summary"
                ? fmtINR(netProfit)
                : fmtINR(lifetime)}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[11px] opacity-95">
            {tab === "income" && (
              <>
                <span className="flex items-center gap-1">
                  {trendDelta.up ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
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
        </div>
      </div>

      {/* Dynamic Keyframe Animations for Sequential Icon Bounce */}
      <style>{`
        @keyframes dynamic-pump {
          0% { transform: scale(1); }
          25% { transform: scale(1.35); }
          50% { transform: scale(0.9); }
          75% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .animate-pump-income {
          animation: dynamic-pump 0.7s cubic-bezier(0.25, 0.8, 0.25, 1) 0.3s both;
        }
        .animate-pump-expense {
          animation: dynamic-pump 0.7s cubic-bezier(0.25, 0.8, 0.25, 1) 0.6s both;
        }
      `}</style>

      {tab === "income" && (
        <IncomeView
          lifetime={lifetime}
          totalPending={totalPending}
          totalBilled={totalBilled}
          collectionRate={collectionRate}
          trend12={trend12}
          kpis={kpis}
          topCustomers={topCustomers}
          modeSplit={modeSplit}
          recent={recent}
          extraTotal={extraTotal}
          extraByCategory={extraByCategory}
          recentExtra={recentExtra}
          onDeleteExtra={(id) => setPendingDelete({ type: "income", id })}
          subFilter={subFilter}
          onSubFilterChange={handleSubFilterChange}
          bookings={bookings}
          customers={customers}
        />
      )}

      {tab === "expenses" && (
        <ExpensesView
          expenses={expenses}
          totalExpense={totalExpense}
          categories={categories}
          expenseByCategory={expenseByCategory}
          trend12={trend12}
          recentExpenses={recentExpenses}
          onAdd={() => {
            setAddTransactionType("expense");
            setAddTransactionOpen(true);
          }}
          onDelete={(id) => setPendingDelete({ type: "expense", id })}
        />
      )}

      {tab === "summary" && (
        <SummaryView
          lifetime={lifetime}
          totalExpense={totalExpense}
          netProfit={netProfit}
          totalPending={totalPending}
          totalBilled={totalBilled}
          collectionRate={collectionRate}
          trend12={trend12}
          expenseByCategory={expenseByCategory}
          incomeByCategory={incomeByCategory}
          unifiedRecentTransactions={unifiedRecentTransactions}
          allTimeTrend={allTimeTrend}
          onEditTx={setEditingTx}
        />
      )}

      {/* Floating Action Button */}
      {tab === "income" && (
        <button
          onClick={() => {
            setAddTransactionType("income");
            setAddTransactionOpen(true);
          }}
          className="fixed bottom-28 right-4 z-30 h-10 px-4 bg-success hover:bg-success/90 text-white shadow-xl rounded-full flex items-center gap-1 active:scale-95 transition cursor-pointer"
          aria-label="Add income"
        >
          <Plus className="size-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Add Income</span>
        </button>
      )}

      {tab === "expenses" && (
        <button
          onClick={() => {
            setAddTransactionType("expense");
            setAddTransactionOpen(true);
          }}
          className="fixed bottom-28 right-4 z-30 h-10 px-4 bg-destructive hover:bg-destructive/90 text-white shadow-xl rounded-full flex items-center gap-1 active:scale-95 transition cursor-pointer"
          aria-label="Add expense"
        >
          <Plus className="size-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Add Expense</span>
        </button>
      )}

      {tab === "summary" && (
        <button
          onClick={() => {
            setAddTransactionType("income"); // pre-select income on summary tab
            setAddTransactionOpen(true);
          }}
          className="fixed bottom-28 right-4 z-30 h-10 px-4 bg-primary text-primary-foreground shadow-xl rounded-full flex items-center gap-1 active:scale-95 transition cursor-pointer"
          aria-label="Add transaction"
        >
          <Plus className="size-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Add</span>
        </button>
      )}

      {addTransactionOpen && (
        <AddTransactionSheet
          initialType={addTransactionType}
          incomeCategories={incomeCats}
          expenseCategories={categories}
          defaultMode={settings.defaultPaymentMode ?? "gpay"}
          modes={settings.paymentModes ?? ["gpay", "cash", "other"]}
          onClose={() => setAddTransactionOpen(false)}
          onSave={(type, payload) => {
            if (type === "income") {
              addExtraIncome(payload);
              toast.success("Income added", { duration: 1500 });
              setTab("income"); // Switch tab live
            } else {
              addExpense(payload);
              toast.success("Expense added", { duration: 1500 });
              setTab("expenses"); // Switch tab live
            }
            setAddTransactionOpen(false);
          }}
        />
      )}

      {editingTx && (
        <EditTransactionSheet
          tx={editingTx}
          incomeCategories={incomeCats}
          expenseCategories={categories}
          modes={settings.paymentModes ?? ["gpay", "cash", "other"]}
          onClose={() => setEditingTx(null)}
          onSave={(updates) => {
            if (editingTx.sourceType === "expense") updateExpense(editingTx.id, updates);
            else if (editingTx.sourceType === "extra_income") updateExtraIncome(editingTx.id, updates);
            else if (editingTx.sourceType === "booking_payment") updatePayment(editingTx.id, updates);
            toast.success("Transaction updated", { duration: 2000 });
            setEditingTx(null);
          }}
          onDelete={() => {
            setPendingDelete({ type: editingTx.sourceType, id: editingTx.id });
            setEditingTx(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title="Delete Transaction?"
        description="This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (!pendingDelete) return;
          const { id, type } = pendingDelete;
          if (type === "income" || type === "extra_income") {
            deleteExtraIncome(id);
            toast.success("Income removed", { action: { label: "Undo", onClick: () => restoreExtraIncome(id) }, duration: 6000 });
          } else if (type === "expense") {
            deleteExpense(id);
            toast.success("Expense removed", { action: { label: "Undo", onClick: () => restoreExpense(id) }, duration: 6000 });
          } else if (type === "booking_payment") {
            deletePayment(id);
            toast.success("Payment removed");
          }
          setPendingDelete(null);
        }}
      />
    </AppShell>
  );
}

// === Income tab ===
function IncomeView(p: {
  lifetime: number;
  totalPending: number;
  totalBilled: number;
  collectionRate: number;
  trend12: { month: string; amount: number }[];
  kpis: {
    count: number;
    avg: number;
    uniqueCustomers: number;
    bestMonth: { month: string; amount: number } | null;
  };
  topCustomers: { c: any; amount: number }[];
  modeSplit: Record<string, number>;
  recent: { p: any; c: any; b: any }[];
  extraTotal: number;
  extraByCategory: { cat: string; amount: number; pct: number }[];
  recentExtra: {
    id: string;
    amount: number;
    category: string;
    note?: string;
    date: string;
    mode?: PaymentMode;
  }[];
  onDeleteExtra: (id: string) => void;
  subFilter: "collected" | "pending";
  onSubFilterChange: (val: "collected" | "pending") => void;
  bookings: any[];
  customers: any[];
}) {
  const pendingList = useMemo(() => {
    const today = startOfDay(new Date());
    return p.bookings
      .filter((b) => {
        if (b.status === "cancelled") return false;
        if (b.status === "completed" || new Date(b.deliveryDate) >= today) {
          return totalDue(b) > 0;
        }
        return false;
      })
      .map((b) => {
        const c = p.customers.find((x) => x.id === b.customerId);
        return {
          bookingId: b.id,
          name: c?.name || b.customerName || "Unknown",
          phone: c?.phone || b.customerPhone || "",
          due: totalDue(b),
          totalAmount: b.totalAmount,
          service: b.service || "Saree PrePleat",
          dateStr: formatAppDate(b.deliveryDate),
        };
      })
      .sort((a, b) => b.due - a.due);
  }, [p.bookings, p.customers]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat
          tint="success"
          icon={<Wallet className="size-3.5" />}
          label="Collected"
          value={fmtINR(p.lifetime)}
        />
        <Stat
          tint="danger"
          icon={<AlertCircle className="size-3.5" />}
          label="Pending"
          value={fmtINR(p.totalPending)}
        />
        <Stat
          tint="primary"
          icon={<TrendingUp className="size-3.5" />}
          label="Billed"
          value={fmtINR(p.totalBilled)}
        />
        <Stat
          tint="muted"
          icon={<IndianRupee className="size-3.5" />}
          label="Collection %"
          value={`${p.collectionRate}%`}
        />
      </div>

      {/* Segmented Filter Toggle Button */}
      <div className="flex bg-secondary p-1 rounded-xl gap-1 mb-4">
        <button
          onClick={() => p.onSubFilterChange("collected")}
          className={cn(
            "flex-grow py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition cursor-pointer text-center",
            p.subFilter === "collected"
              ? "bg-card text-foreground shadow-xs border border-border/10"
              : "text-muted-foreground hover:bg-secondary/40"
          )}
        >
          Collected Payments
        </button>
        <button
          onClick={() => p.onSubFilterChange("pending")}
          className={cn(
            "flex-grow py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition cursor-pointer text-center",
            p.subFilter === "pending"
              ? "bg-card text-foreground shadow-xs border border-border/10"
              : "text-muted-foreground hover:bg-secondary/40"
          )}
        >
          Pending Payments ({pendingList.length})
        </button>
      </div>

      {p.subFilter === "collected" ? (
        <>
          <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Earnings trend
                </p>
                <p className="text-[10px] text-muted-foreground">Last 12 months</p>
              </div>
              <p className="text-sm font-bold tabular-nums">
                {fmtINR(p.trend12.reduce((s, m) => s + m.amount, 0))}
              </p>
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
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    opacity={0.4}
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ stroke: "var(--color-primary)", strokeOpacity: 0.3 }}
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [fmtINR(v), "Earned"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    fill="url(#earnGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <KpiCard
              icon={<CalendarCheck className="size-3.5" />}
              label="Payments"
              value={String(p.kpis.count)}
              sub={`avg ${fmtINR(p.kpis.avg)}`}
              tint="primary"
            />
            <KpiCard
              icon={<Users className="size-3.5" />}
              label="Unique customers"
              value={String(p.kpis.uniqueCustomers)}
              sub="all time"
              tint="accent"
            />
            <KpiCard
              icon={<TrendingUp className="size-3.5" />}
              label="Best month"
              value={p.kpis.bestMonth ? fmtINR(p.kpis.bestMonth.amount) : "—"}
              sub={p.kpis.bestMonth?.month ?? "—"}
              tint="success"
            />
            <KpiCard
              icon={<Crown className="size-3.5" />}
              label="Top customer"
              value={p.topCustomers[0] ? fmtINR(p.topCustomers[0].amount) : "—"}
              sub={p.topCustomers[0]?.c?.name ?? "—"}
              tint="gold"
            />
          </div>

          <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Payment mode split
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["gpay", "cash", "other"] as const).map((m) => {
                const pct = p.lifetime > 0 ? Math.round((p.modeSplit[m] / p.lifetime) * 100) : 0;
                return (
                  <div key={m} className="bg-secondary rounded-xl p-2 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {m}
                    </p>
                    <p className="font-bold tabular-nums text-sm mt-0.5">{fmtINR(p.modeSplit[m])}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Top customers
              </p>
              <Crown className="size-3.5 text-gold" />
            </div>
            {p.topCustomers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No payments yet</p>
            ) : (
              <ul className="space-y-1.5">
                {p.topCustomers.map((r, i) => (
                  <li key={r.c!.id}>
                    <Link
                      to="/customers/$id"
                      params={{ id: r.c!.id }}
                      className="flex items-center gap-2 p-2 -mx-1 rounded-xl active:bg-secondary"
                    >
                      <div
                        className={cn(
                          "size-7 rounded-full flex items-center justify-center text-[11px] font-bold",
                          i === 0
                            ? "bg-gold/20 text-gold"
                            : i === 1
                              ? "bg-secondary text-foreground"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {i + 1}
                      </div>
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
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Recent payments
              </p>
              <span className="text-[10px] text-muted-foreground">last {p.recent.length}</span>
            </div>
            {p.recent.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No payments yet</p>
            ) : (
              <div className="max-h-[250px] overflow-y-auto pr-1">
                <ul className="space-y-1.5">
                  {p.recent.map(({ p: pay, c, b }) => (
                    <li
                      key={pay.id}
                      className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-secondary/40 transition"
                    >
                      <div
                        className={cn(
                          "shrink-0 size-9 rounded-xl flex items-center justify-center text-[9px] font-bold uppercase",
                          pay.mode === "gpay"
                            ? "bg-[oklch(0.92_0.08_240)] text-[oklch(0.4_0.18_240)]"
                            : pay.mode === "cash"
                              ? "bg-[oklch(0.92_0.1_140)] text-[oklch(0.35_0.15_140)]"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {(pay.mode ?? "other").slice(0, 4)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-semibold text-sm truncate">{c?.name ?? "Unknown"}</p>
                          <p className="font-bold tabular-nums text-sm text-success">
                            {fmtINR(pay.amount)}
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {formatAppDateTime(pay.date)}
                          {b ? ` · ${b.service}` : ""}
                        </p>
                      </div>
                      {b && (
                        <Link
                          to="/bookings/$id"
                          params={{ id: b.id }}
                          className="shrink-0 text-primary"
                        >
                          <ArrowRight className="size-4" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Extra income */}
          <div className="bg-card card-shadow rounded-2xl p-3 mt-3 mb-20">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Extra income
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Not tied to bookings · tap + below to add
                </p>
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
                          <span
                            className={cn(
                              "size-2 rounded-full",
                              i === 0 ? "bg-success" : i === 1 ? "bg-primary" : "bg-accent",
                            )}
                          />
                          {row.cat}
                        </span>
                        <span className="tabular-nums font-bold">
                          {fmtINR(row.amount)}{" "}
                          <span className="text-muted-foreground font-normal">· {row.pct}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn(
                            "h-full",
                            i === 0 ? "bg-success" : i === 1 ? "bg-primary" : "bg-accent",
                          )}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="max-h-[250px] overflow-y-auto pr-1 border-t border-border pt-2">
                  <ul className="space-y-1.5">
                    {p.recentExtra.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-secondary/40 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-semibold text-sm truncate">{e.category}</span>
                            <p className="font-bold tabular-nums text-sm text-success">
                              +{fmtINR(e.amount)}
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {formatAppDateTime(e.date)}
                            {e.note ? ` · ${e.note}` : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => p.onDeleteExtra(e.id)}
                          className="shrink-0 size-8 rounded-full hover:bg-destructive/10 text-destructive flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        /* Pending Payments List */
        <div className="bg-card card-shadow rounded-2xl p-4 mb-20">
          <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
            <div>
              <p className="text-xs font-bold text-foreground">Outstanding Bookings</p>
              <p className="text-[10px] text-muted-foreground">{pendingList.length} client{pendingList.length > 1 ? "s" : ""} pending</p>
            </div>
            <span className="text-xs font-bold text-destructive">Total Due: {fmtINR(p.totalPending)}</span>
          </div>

          {pendingList.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No pending payments! All cleared ✅</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {pendingList.map((item) => (
                <li key={item.bookingId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="size-9 rounded-full bg-destructive/10 text-destructive text-sm font-bold flex items-center justify-center shrink-0">
                      {item.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                        <p className="text-sm font-bold text-destructive tabular-nums">{fmtINR(item.due)}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.dateStr} · {item.service} (Total: {fmtINR(item.totalAmount)})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/20">
                    <Link
                      to="/bookings/$id"
                      params={{ id: item.bookingId }}
                      className="text-[10px] font-semibold text-primary px-2.5 py-1 rounded-md bg-primary/10 active:scale-95 transition"
                    >
                      View Booking
                    </Link>
                    {item.phone && (
                      <div className="flex gap-2">
                        <a
                          href={`tel:${item.phone.replace(/\D/g, "")}`}
                          className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground px-2 py-1 rounded-md bg-secondary active:scale-95 transition"
                        >
                          <Phone className="size-3" /> Call
                        </a>
                        <a
                          href={`https://wa.me/${item.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                            `Hi ${item.name}, this is a gentle reminder regarding the pending payment of ${fmtINR(item.due)} for your ${item.service} booking on ${item.dateStr}.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[10px] font-semibold text-[oklch(0.45_0.18_150)] px-2 py-1 rounded-md bg-[oklch(0.55_0.18_150)]/10 active:scale-95 transition"
                        >
                          <MessageCircle className="size-3" /> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

// === Expenses tab ===
function ExpensesView(p: {
  expenses: any[];
  totalExpense: number;
  categories: string[];
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
        <p className="text-xs text-muted-foreground mb-3">
          Add categories in Settings → Pricing first.
        </p>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
        >
          Open Settings
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* 12-month expense trend */}
      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Monthly expenses
            </p>
            <p className="text-[10px] text-muted-foreground">Last 12 months</p>
          </div>
        </div>
        <div className="h-36">
          {p.trend12.every((m) => m.expense === 0) ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={p.trend12} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [fmtINR(v), "Spent"]}
                />
                <Bar dataKey="expense" fill="var(--color-destructive)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            By category
          </p>
          <p className="text-sm font-bold tabular-nums text-destructive">
            {fmtINR(p.totalExpense)}
          </p>
        </div>
        {p.expenseByCategory.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No expenses logged yet. Tap + to add.
          </p>
        ) : (
          <ul className="space-y-2">
            {p.expenseByCategory.map((row, i) => (
              <li key={row.cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        i === 0
                          ? "bg-destructive"
                          : i === 1
                            ? "bg-primary"
                            : i === 2
                              ? "bg-accent"
                              : "bg-muted-foreground",
                      )}
                    />
                    {row.cat}
                  </span>
                  <span className="tabular-nums font-bold">
                    {fmtINR(row.amount)}{" "}
                    <span className="text-muted-foreground font-normal">· {row.pct}%</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      "h-full",
                      i === 0
                        ? "bg-destructive"
                        : i === 1
                          ? "bg-primary"
                          : i === 2
                            ? "bg-accent"
                            : "bg-muted-foreground",
                    )}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent expenses */}
      <div className="bg-card card-shadow rounded-2xl p-3 mb-20">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Recent expenses
          </p>
          <span className="text-[10px] text-muted-foreground">last {p.recentExpenses.length}</span>
        </div>
        {p.recentExpenses.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No expenses yet</p>
        ) : (
          <div className="max-h-[250px] overflow-y-auto pr-1">
            <ul className="space-y-1.5">
              {p.recentExpenses.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-secondary/40 transition"
                >
                  <div className="shrink-0 size-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                    <Receipt className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{e.category}</p>
                      <p className="font-bold tabular-nums text-sm text-destructive">
                        −{fmtINR(e.amount)}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {formatAppDateTime(e.date)}
                      {e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => p.onDelete(e.id)}
                    className="shrink-0 size-8 rounded-full hover:bg-destructive/10 text-destructive flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

// === Summary tab ===
function SummaryView(p: {
  lifetime: number;
  totalExpense: number;
  netProfit: number;
  totalPending: number;
  totalBilled: number;
  collectionRate: number;
  trend12: { month: string; amount: number; expense: number; net: number }[];
  expenseByCategory: { cat: string; amount: number; pct: number }[];
  incomeByCategory: { cat: string; amount: number; pct: number }[];
  unifiedRecentTransactions: Array<{
    id: string;
    type: "income" | "expense";
    sourceType?: string;
    amount: number;
    category: string;
    note?: string;
    date: string;
    mode?: PaymentMode;
    customerName?: string;
  }>;
  onEditTx: (tx: any) => void;
  allTimeTrend: Array<{
    month: string;
    amount: number;
    expense: number;
    net: number;
  }>;
}) {
  const margin = p.lifetime > 0 ? Math.round((p.netProfit / p.lifetime) * 100) : 0;

  const [dateFilter, setDateFilter] = useState<string>("all"); // "all" or "yyyy-MM"

  // Build cumulative data and compute domains
  const { allTimeWithCumulative, allTimeDomains, lifetimeCumulative } = useMemo(() => {
    if (!p.allTimeTrend || p.allTimeTrend.length === 0) {
      return {
        allTimeWithCumulative: [],
        lifetimeCumulative: 0,
        allTimeDomains: { minNet: 0, maxNet: 1000, maxBarStacked: 1000, maxCumulative: 1000 },
      };
    }

    let minNet = Infinity,
      maxNet = -Infinity,
      maxBarStacked = 0,
      running = 0;

    const allTimeWithCumulative = p.allTimeTrend.map((t) => {
      running += t.amount;
      if (t.net < minNet) minNet = t.net;
      if (t.net > maxNet) maxNet = t.net;
      const stacked = t.amount + t.expense;
      if (stacked > maxBarStacked) maxBarStacked = stacked;
      return { ...t, cumulative: running };
    });

    const netRange = maxNet - minNet;
    const netPadding = netRange === 0 ? 1000 : netRange * 0.15;
    const safeMaxBarStacked = maxBarStacked || 1000;

    return {
      allTimeWithCumulative,
      lifetimeCumulative: running,
      allTimeDomains: {
        minNet: minNet < 0 ? minNet - netPadding : 0,
        maxNet: maxNet + netPadding,
        maxBarStacked: safeMaxBarStacked * 3.5,
        maxCumulative: running * 1.08 || 1000,
      },
    };
  }, [p.allTimeTrend]);

  // Milestone badges for cumulative
  const milestones = useMemo(
    () =>
      [25000, 50000, 75000, 100000, 150000, 200000, 300000, 500000].filter(
        (v) => v <= lifetimeCumulative,
      ),
    [lifetimeCumulative],
  );

  // Memos for dynamic helper metrics under the chart
  const metrics = useMemo(() => {
    return `Lifetime Margin: ${margin}% · Total Net Profit: ${fmtINR(p.netProfit)}`;
  }, [margin, p.netProfit]);

  return (
    <>
      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        {/* Chart Header */}
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Lifetime Summary (All Time)
          </p>
        </div>

        <div className="h-52 -mx-2">
          {allTimeWithCumulative.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No transaction data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={allTimeWithCumulative}
                margin={{ top: 6, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="cumulativeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                />
                {/* Y-axis for cumulative area (top layer) */}
                <YAxis yAxisId="cumulative" hide domain={[0, allTimeDomains.maxCumulative]} />
                {/* Y-axis for income/expense bars */}
                <YAxis yAxisId="bars" hide domain={[0, allTimeDomains.maxBarStacked]} />

                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => {
                    const label =
                      name === "cumulative"
                        ? "Cumulative Total"
                        : name === "amount"
                          ? "Income"
                          : name === "expense"
                            ? "Expense"
                            : name;
                    return [fmtINR(v), label];
                  }}
                />

                {/* Cumulative area — background layer */}
                <Area
                  yAxisId="cumulative"
                  type="monotone"
                  dataKey="cumulative"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  strokeOpacity={1.0}
                  fill="url(#cumulativeAreaGrad)"
                  dot={{
                    r: 2.5,
                    fill: "var(--color-card)",
                    stroke: "var(--color-primary)",
                    strokeWidth: 1.5,
                  }}
                  activeDot={{ r: 4.5, fill: "var(--color-primary)" }}
                />

                {/* Stacked Income & Expense bars */}
                <Bar
                  yAxisId="bars"
                  dataKey="amount"
                  fill="#10b981"
                  stackId="a"
                  barSize={10}
                  opacity={0.85}
                />
                <Bar
                  yAxisId="bars"
                  dataKey="expense"
                  fill="#ef4444"
                  stackId="a"
                  barSize={10}
                  radius={[3, 3, 0, 0]}
                  opacity={0.85}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Milestone badges */}
        {milestones.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
            {milestones.map((v) => (
              <span
                key={v}
                className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary"
              >
                ✓ {v >= 100000 ? `₹${v / 100000}L` : `₹${v / 1000}k`}
              </span>
            ))}
          </div>
        )}
        {/* Dynamic Helper Insight Banner under the Chart */}
        <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
          <span>{metrics}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat
          tint="success"
          icon={<Wallet className="size-3.5" />}
          label="Income"
          value={fmtINR(p.lifetime)}
        />
        <Stat
          tint="danger"
          icon={<Receipt className="size-3.5" />}
          label="Expense"
          value={fmtINR(p.totalExpense)}
        />
        <Stat
          tint="primary"
          icon={<TrendingUp className="size-3.5" />}
          label="Net profit"
          value={fmtINR(p.netProfit)}
        />
        <Stat
          tint="muted"
          icon={<IndianRupee className="size-3.5" />}
          label="Margin"
          value={`${margin}%`}
        />
      </div>

      {/* Side-by-side Top Sources */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-card card-shadow rounded-2xl p-3 border border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Top Earning Source
          </p>
          {p.incomeByCategory.length > 0 ? (
            <div className="mt-1">
              <p className="font-semibold text-sm truncate text-success">
                {p.incomeByCategory[0].cat}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                {fmtINR(p.incomeByCategory[0].amount)} ({p.incomeByCategory[0].pct}%)
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">No earnings yet</p>
          )}
        </div>

        <div className="bg-card card-shadow rounded-2xl p-3 border border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Top Spending Category
          </p>
          {p.expenseByCategory.length > 0 ? (
            <div className="mt-1">
              <p className="font-semibold text-sm truncate text-destructive">
                {p.expenseByCategory[0].cat}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                {fmtINR(p.expenseByCategory[0].amount)} ({p.expenseByCategory[0].pct}%)
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">No expenses yet</p>
          )}
        </div>
      </div>

      <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Collection
          </p>
          <p className="text-[11px] font-bold tabular-nums">{p.collectionRate}%</p>
        </div>
        <div className="h-3 rounded-full overflow-hidden bg-secondary flex">
          <div className="bg-success h-full" style={{ width: `${p.collectionRate}%` }} />
          <div
            className="bg-destructive/60 h-full"
            style={{ width: `${100 - p.collectionRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>
            Paid <span className="font-bold text-success tabular-nums">{fmtINR(p.lifetime)}</span>
          </span>
          <span>
            Pending{" "}
            <span className="font-bold text-destructive tabular-nums">
              {fmtINR(p.totalPending)}
            </span>
          </span>
        </div>
      </div>

      {/* Monthly Analytics Card */}
      {p.allTimeTrend.length > 0 &&
        (() => {
          const months = p.allTimeTrend.filter((m) => m.amount > 0);
          const totalIncome = months.reduce((s, m) => s + m.amount, 0);
          const avgPerMonth = months.length > 0 ? totalIncome / months.length : 0;
          const peak = months.reduce((a, b) => (b.amount > a.amount ? b : a), months[0]);
          const lowest = months.reduce((a, b) => (b.amount < a.amount ? b : a), months[0]);
          return (
            <div className="bg-card card-shadow rounded-2xl p-3 mb-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">
                Monthly Analytics
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-primary/8 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Avg / Month
                  </p>
                  <p className="font-bold text-sm text-primary tabular-nums">
                    {fmtINR(avgPerMonth)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{months.length} months</p>
                </div>
                <div className="bg-success/8 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Peak Month
                  </p>
                  <p className="font-bold text-sm text-success tabular-nums">
                    {fmtINR(peak.amount)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{peak.month}</p>
                </div>
                <div className="bg-destructive/8 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Low Month
                  </p>
                  <p className="font-bold text-sm text-destructive tabular-nums">
                    {fmtINR(lowest.amount)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{lowest.month}</p>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Unified Recent Cash Flow Timeline */}
      <div className="bg-card card-shadow rounded-2xl p-3 mb-20">
        {/* Date filter header */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Recent Cash Flow
          </p>
          <div className="flex items-center gap-1.5">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-[10px] font-semibold bg-secondary border border-border rounded-lg px-2 py-1 text-foreground cursor-pointer outline-none"
            >
              <option value="all">All Time</option>
              {Array.from(new Set(p.unifiedRecentTransactions.map((tx) => tx.date.slice(0, 7))))
                .sort((a, b) => b.localeCompare(a))
                .map((ym) => (
                  <option key={ym} value={ym}>
                    {format(parseISO(ym + "-01"), "MMM yyyy")}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* filtered list */}
        {(() => {
          const filtered =
            dateFilter === "all"
              ? p.unifiedRecentTransactions
              : p.unifiedRecentTransactions.filter((tx) => tx.date.startsWith(dateFilter));
          return filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No transactions for this period
            </p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto pr-1">
              {/* filtered summary row */}
              {dateFilter !== "all" && (
                <div className="flex justify-between text-[10px] font-semibold mb-2 px-1">
                  <span className="text-success">
                    In:{" "}
                    {fmtINR(
                      filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
                    )}
                  </span>
                  <span className="text-destructive">
                    Out:{" "}
                    {fmtINR(
                      filtered
                        .filter((t) => t.type === "expense")
                        .reduce((s, t) => s + t.amount, 0),
                    )}
                  </span>
                  <span className="text-muted-foreground">{filtered.length} txns</span>
                </div>
              )}
              <ul className="space-y-2.5 relative border-l border-border pl-3 ml-2.5">
                {filtered.map((tx) => {
                  const isInc = tx.type === "income";
                  return (
                    <li key={tx.id} className="relative">
                      <div
                        className={cn(
                          "absolute -left-[17px] top-1.5 size-2 rounded-full border bg-card transition-all duration-300",
                          isInc ? "border-success bg-success" : "border-destructive bg-destructive",
                        )}
                      />
                      <button type="button" onClick={() => p.onEditTx(tx)} className="w-full text-left flex items-center justify-between gap-3 bg-secondary/35 hover:bg-secondary/60 p-2 rounded-xl transition duration-200 cursor-pointer">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "px-1 py-0.5 rounded text-[8px] font-bold uppercase shrink-0",
                                isInc
                                  ? "bg-success/10 text-success"
                                  : "bg-destructive/10 text-destructive",
                              )}
                            >
                              {isInc ? "In" : "Out"}
                            </span>
                            <p className="font-semibold text-sm truncate text-foreground">
                              {tx.customerName || tx.category}
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {tx.customerName ? `${tx.category} · ` : ""}
                            {formatAppDateTime(tx.date)}
                            {tx.note ? ` · ${tx.note}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={cn(
                              "font-bold text-sm tabular-nums",
                              isInc ? "text-success" : "text-destructive",
                            )}
                          >
                            {isInc ? "+" : "−"}
                            {fmtINR(tx.amount)}
                          </p>
                          {tx.mode && (
                            <span className="text-[9px] uppercase font-semibold text-muted-foreground block leading-none mt-0.5">
                              {tx.mode}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })()}
      </div>
    </>
  );
}

// === Edit Transaction Sheet ===
function EditTransactionSheet({
  tx,
  incomeCategories,
  expenseCategories,
  modes,
  onClose,
  onSave,
  onDelete,
}: {
  tx: any;
  incomeCategories: string[];
  expenseCategories: string[];
  modes: string[];
  onClose: () => void;
  onSave: (p: { amount: number; category: string; note?: string; date: string; mode: PaymentMode }) => void;
  onDelete: () => void;
}) {
  const isIncome = tx.type === "income";
  const [amount, setAmount] = useState<string>(String(tx.amount || ""));
  
  const categories = isIncome ? incomeCategories : expenseCategories;
  const [category, setCategory] = useState<string>(
    tx.category && categories.includes(tx.category) 
      ? tx.category 
      : tx.sourceType === "booking_payment" 
        ? tx.category 
        : (categories[0] ?? "Other")
  );
  
  const [note, setNote] = useState(tx.note || "");
  const [mode, setMode] = useState<PaymentMode>(tx.mode || "gpay");
  const [date, setDate] = useState<string>(tx.date ? tx.date.slice(0, 10) : new Date().toISOString().slice(0, 10));

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!category && tx.sourceType !== "booking_payment") return toast.error("Pick a category");
    
    let timeStr = new Date().toTimeString().slice(0, 8);
    if (tx.date && tx.date.length > 10) {
      timeStr = tx.date.slice(11, 19);
    }
    const iso = `${date}T${timeStr}Z`;

    onSave({ amount: amt, category, note: note.trim() || undefined, date: iso, mode });
  };

  return (
    <>
      <div className="fixed inset-0 z-[19999] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[20000] bg-card rounded-t-3xl p-4 pb-6 max-h-[85vh] overflow-y-auto card-shadow transition-all duration-300 border-t border-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3
            className={cn(
              "font-display font-bold text-lg transition-colors duration-300",
              isIncome ? "text-success" : "text-destructive",
            )}
          >
            Edit {tx.sourceType === "booking_payment" ? "Booking Payment" : isIncome ? "Income" : "Expense"}
          </h3>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Amount Input */}
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Amount</label>
        <div className={cn("relative mt-1 mb-3 transition-colors duration-300 border-2 rounded-2xl flex items-center px-3 py-2 bg-secondary", isIncome ? "focus-within:border-success/50 border-transparent" : "focus-within:border-destructive/50 border-transparent")}>
          <IndianRupee className="size-5 text-muted-foreground" />
          <input type="number" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="bg-transparent flex-1 pl-1 text-2xl font-bold tabular-nums focus:outline-none" />
        </div>

        {/* Category Selection */}
        {tx.sourceType !== "booking_payment" && (
          <div className="mb-3">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Category</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {categories.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition border cursor-pointer", category === c ? (isIncome ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30") : "bg-secondary text-foreground border-transparent hover:bg-secondary/80")}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date and Mode */}
        <div className="grid grid-cols-2 gap-3 mb-4 items-end">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-11 text-sm font-semibold bg-secondary border border-border rounded-xl px-3 outline-none focus:border-foreground/30 transition appearance-none" style={{WebkitAppearance: "none"}} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} className="w-full h-11 text-sm font-semibold bg-secondary border border-border rounded-xl px-3 outline-none focus:border-foreground/30 transition capitalize cursor-pointer">
              {modes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Note */}
        <div className="mb-6">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Note (Optional)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="E.g., advance, tips..." className="w-full text-sm font-semibold bg-secondary border border-border rounded-xl px-3 py-2.5 outline-none focus:border-foreground/30 transition" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button onClick={submit} className={cn("flex-1 py-3.5 rounded-xl text-white font-bold text-sm shadow-md active:scale-[0.98] transition cursor-pointer", isIncome ? "bg-success hover:bg-success/90 shadow-success/20" : "bg-destructive hover:bg-destructive/90 shadow-destructive/20")}>
            Save Changes
          </button>
          <button onClick={onDelete} className="w-12 h-[50px] flex items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition cursor-pointer shrink-0" title="Delete Transaction">
            <Trash2 className="size-5" />
          </button>
        </div>
      </div>
    </>
  );
}

// === Unified Add Transaction Sheet ===
function AddTransactionSheet({
  initialType,
  incomeCategories,
  expenseCategories,
  defaultMode,
  modes,
  onClose,
  onSave,
}: {
  initialType: "income" | "expense";
  incomeCategories: string[];
  expenseCategories: string[];
  defaultMode: PaymentMode;
  modes: string[];
  onClose: () => void;
  onSave: (
    type: "income" | "expense",
    p: { amount: number; category: string; note?: string; date: string; mode: PaymentMode },
  ) => void;
}) {
  const [type, setType] = useState<"income" | "expense">(initialType);
  const [amount, setAmount] = useState<string>("");

  const categories = type === "income" ? incomeCategories : expenseCategories;
  const [category, setCategory] = useState<string>(
    initialType === "income"
      ? (incomeCategories[0] ?? "Other Income")
      : (expenseCategories[0] ?? "Other"),
  );

  const [note, setNote] = useState("");
  const [mode, setMode] = useState<PaymentMode>(defaultMode);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const handleTypeChange = (newType: "income" | "expense") => {
    setType(newType);
    const newCats = newType === "income" ? incomeCategories : expenseCategories;
    setCategory(newCats[0] ?? (newType === "income" ? "Other Income" : "Other"));
  };

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!category) return toast.error("Pick a category");
    const iso = new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
    onSave(type, { amount: amt, category, note: note.trim() || undefined, date: iso, mode });
  };

  const isIncome = type === "income";

  return (
    <>
      <div className="fixed inset-0 z-[19999] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[20000] bg-card rounded-t-3xl p-4 pb-6 max-h-[85vh] overflow-y-auto card-shadow transition-all duration-300 border-t border-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3
            className={cn(
              "font-display font-bold text-lg transition-colors duration-300",
              isIncome ? "text-success" : "text-destructive",
            )}
          >
            New {isIncome ? "Income" : "Expense"}
          </h3>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Sliding Segmented Controller */}
        <div className="relative flex p-1 bg-secondary rounded-2xl mb-4 border border-border">
          {/* Sliding background indicator */}
          <div
            className={cn(
              "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 ease-out shadow-sm",
              isIncome
                ? "left-1 bg-success/15 border border-success/30"
                : "left-[calc(50%+2px)] bg-destructive/15 border border-destructive/30",
            )}
          />

          <button
            type="button"
            onClick={() => handleTypeChange("income")}
            className={cn(
              "relative z-10 flex-1 py-2.5 text-xs font-bold text-center transition-colors duration-300 cursor-pointer flex items-center justify-center gap-1.5",
              isIncome ? "text-success" : "text-muted-foreground",
            )}
          >
            <Plus className="size-3.5" /> Income
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange("expense")}
            className={cn(
              "relative z-10 flex-1 py-2.5 text-xs font-bold text-center transition-colors duration-300 cursor-pointer flex items-center justify-center gap-1.5",
              !isIncome ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <Plus className="size-3.5" /> Expense
          </button>
        </div>

        {/* Amount Input */}
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Amount
        </label>
        <div
          className={cn(
            "relative mt-1 mb-3 transition-colors duration-300 border-2 rounded-2xl flex items-center px-3 py-2 bg-secondary",
            isIncome
              ? "focus-within:border-success/50 border-transparent"
              : "focus-within:border-destructive/50 border-transparent",
          )}
        >
          <IndianRupee className="size-5 text-muted-foreground" />
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="bg-transparent flex-1 pl-1 text-2xl font-bold tabular-nums focus:outline-none"
          />
        </div>

        {/* Category Selector */}
        <div className="flex items-baseline justify-between mb-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Category
          </label>
          {categories.length === 0 && (
            <span className="text-[9px] text-destructive font-medium">
              No custom categories set
            </span>
          )}
        </div>

        {categories.length === 0 ? (
          <div className="bg-secondary rounded-xl p-3 text-center mb-3 text-xs text-muted-foreground">
            {isIncome
              ? "Add income categories in Settings → Headers"
              : "Add expense categories in Settings → Pricing"}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 mt-1 mb-3 max-h-32 overflow-y-auto pr-1">
            {categories.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer",
                    active
                      ? isIncome
                        ? "bg-success text-white shadow-sm"
                        : "bg-destructive text-white shadow-sm"
                      : "bg-secondary text-foreground hover:bg-secondary/80",
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}

        {/* Date Input */}
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={cn(
            "w-full bg-secondary rounded-2xl px-3 py-2.5 mt-1 mb-3 text-sm focus:outline-none border-2 border-transparent transition-colors duration-300",
            isIncome ? "focus:border-success/50" : "focus:border-destructive/50",
          )}
        />

        {/* Mode Selector */}
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Mode
        </label>
        <div className="flex flex-wrap gap-2 mt-1 mb-3">
          {modes.map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m as PaymentMode)}
                className={cn(
                  "px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer",
                  active
                    ? isIncome
                      ? "bg-success text-white shadow-sm"
                      : "bg-destructive text-white shadow-sm"
                    : "bg-secondary text-foreground hover:bg-secondary/80",
                )}
              >
                {m}
              </button>
            );
          })}
        </div>

        {/* Note Input */}
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Note (optional)
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isIncome ? "e.g. Tip from bride" : "e.g. Cloth purchase"}
          className={cn(
            "w-full bg-secondary rounded-2xl px-3 py-2.5 mt-1 mb-5 text-sm focus:outline-none border-2 border-transparent transition-colors duration-300",
            isIncome ? "focus:border-success/50" : "focus:border-destructive/50",
          )}
        />

        {/* Submit Button */}
        <button
          onClick={submit}
          className={cn(
            "w-full py-3 rounded-full font-bold text-white shadow-md active:scale-98 transition-all duration-300 cursor-pointer text-sm uppercase tracking-wider",
            isIncome
              ? "bg-success hover:bg-success/90 hover:shadow-success/20"
              : "bg-destructive hover:bg-destructive/90 hover:shadow-destructive/20",
          )}
        >
          Save {isIncome ? "income" : "expense"}
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

function Stat({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: "primary" | "success" | "danger" | "muted";
}) {
  const tintCls =
    tint === "primary"
      ? "text-primary"
      : tint === "success"
        ? "text-success"
        : tint === "danger"
          ? "text-destructive"
          : "text-muted-foreground";
  return (
    <div className="bg-card card-shadow rounded-2xl p-3">
      <div
        className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold ${tintCls}`}
      >
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-display font-semibold mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tint: "primary" | "success" | "accent" | "gold";
}) {
  const tintCls =
    tint === "primary"
      ? "text-primary"
      : tint === "success"
        ? "text-success"
        : tint === "gold"
          ? "text-gold"
          : "text-accent-foreground";
  return (
    <div className="bg-card card-shadow rounded-2xl p-3">
      <div
        className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold ${tintCls}`}
      >
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="text-base font-display font-bold mt-1 tabular-nums truncate">{value}</p>
      <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
    </div>
  );
}
