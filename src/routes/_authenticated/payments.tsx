import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, fmtINR, totalDue, formatShortBillNumber, formatAppDate, formatAppTime, formatAppDateTime, type PaymentMode } from "@/lib/store";
import { useMemo, useState, useEffect } from "react";
import { cn, cleanPhoneForDialing, cleanPhoneForWhatsApp } from "@/lib/utils";
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
  AlertTriangle,
  Wallet,
  Download,
  FileText,
  Sparkles,
  TrendingDown,
  Users,
  Crown,
  CalendarCheck,
  Calendar,
  ArrowRight,
  Plus,
  Trash2,
  Receipt,
  PieChart,
  Tag,
  X,
  Phone,
  MessageCircle,
  Search,
  Check,
  CheckCircle,
  ChevronRight,
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
      { title: "Finances — Eyas Saree Drapist" },
      {
        name: "description",
        content: "Revenue, payments register, pending customer dues, and financial summary.",
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

  const addPayment = useStore((s) => s.addPayment);
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
      search: (prev: any) => ({ ...prev, filter: val }),
    } as any);
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
    return bookings.reduce((s, b) => {
      if (b.status !== "completed") return s;
      return s + totalDue(b);
    }, 0);
  }, [bookings]);
  const totalBilled = useMemo(
    () =>
      bookings.reduce(
        (s, b) => s + ((b.totalAmount || 0) + (b.extraCharges || 0) - (b.discount || 0)),
        0,
      ),
    [bookings],
  );
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

  const serviceSplit = useMemo(() => {
    let drape = 0;
    let prepleat = 0;
    payments.forEach((p) => {
      const b = bookings.find((x) => x.id === p.bookingId);
      if (b?.service === "drape") drape += p.amount;
      else if (b?.service === "prepleat") prepleat += p.amount;
    });
    return { drape, prepleat };
  }, [payments, bookings]);

  const customerKindSplit = useMemo(() => {
    let artist = 0;
    let client = 0;
    payments.forEach((p) => {
      const c = customers.find((x) => x.id === p.customerId);
      if (c?.kind === "artist") artist += p.amount;
      else client += p.amount;
    });
    return { artist, client };
  }, [payments, customers]);

  const monthlyYearlyReport = useMemo(() => {
    const years = new Map<string, Map<string, { collected: number; booked: number }>>();
    const addCollected = (dateStr: string, amount: number) => {
      if (!dateStr) return;
      try {
        const d = parseISO(dateStr);
        if (isNaN(d.getTime())) return;
        const y = format(d, "yyyy");
        const mStr = format(d, "MM-MMM");
        if (!years.has(y)) years.set(y, new Map());
        const yMap = years.get(y)!;
        const prev = yMap.get(mStr) ?? { collected: 0, booked: 0 };
        yMap.set(mStr, { ...prev, collected: prev.collected + amount });
      } catch (err) {}
    };
    const addBooked = (dateStr: string, amount: number) => {
      if (!dateStr) return;
      try {
        const d = parseISO(dateStr);
        if (isNaN(d.getTime())) return;
        const y = format(d, "yyyy");
        const mStr = format(d, "MM-MMM");
        if (!years.has(y)) years.set(y, new Map());
        const yMap = years.get(y)!;
        const prev = yMap.get(mStr) ?? { collected: 0, booked: 0 };
        yMap.set(mStr, { ...prev, booked: prev.booked + amount });
      } catch (err) {}
    };
    payments.forEach((p) => addCollected(p.date, p.amount));
    extraIncomes.forEach((p) => addCollected(p.date, p.amount));
    bookings.forEach((b) =>
      addBooked(
        b.deliveryDate,
        (b.totalAmount || 0) + (b.extraCharges || 0) - (b.discount || 0),
      ),
    );

    return Array.from(years.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, monthsMap]) => {
        const months = Array.from(monthsMap.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([k, v]) => ({ label: k.split("-")[1] || "Unknown", collected: v.collected, booked: v.booked }));
        return {
          year,
          totalCollected: months.reduce((s, m) => s + m.collected, 0),
          totalBooked: months.reduce((s, m) => s + m.booked, 0),
          months,
        };
      });
  }, [payments, extraIncomes, bookings]);

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
            formatShortBillNumber(b?.billNumber, b?.id) || "—",
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
            Finances
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
              { id: "payments", label: "Payments", icon: Wallet },
              { id: "dues", label: "Pending Dues", icon: AlertCircle },
              { id: "summary", label: "Summary", icon: PieChart },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const isTabActive =
              t.id === "dues"
                ? tab === "income" && subFilter === "pending"
                : t.id === "payments"
                ? tab === "income" && subFilter === "collected"
                : tab === "summary";

            return (
              <button
                key={t.id}
                onClick={() => {
                  if (t.id === "payments") {
                    setTab("income");
                    handleSubFilterChange("collected");
                  } else if (t.id === "dues") {
                    setTab("income");
                    handleSubFilterChange("pending");
                  } else {
                    setTab("summary");
                  }
                }}
                className={cn(
                  "py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95",
                  isTabActive
                    ? t.id === "dues"
                      ? "bg-amber-600 text-white shadow"
                      : t.id === "payments"
                      ? "bg-success text-white shadow"
                      : "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-secondary/40",
                )}
              >
                <Icon className="size-3.5" /> {t.label}
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
          serviceSplit={serviceSplit}
          customerKindSplit={customerKindSplit}
          monthlyYearlyReport={monthlyYearlyReport}
          onAddPayment={addPayment}
          settings={settings}
          expenses={expenses}
          totalExpense={totalExpense}
          categories={categories}
          onDeleteExpense={(id) => setPendingDelete({ type: "expense", id })}
          onEditTx={setEditingTx}
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
          onViewPending={() => {
            setTab("income");
            handleSubFilterChange("pending");
          }}
        />
      )}

      {/* Floating Action Button (Compact Extra Income / Expense entry) */}
      <button
        onClick={() => {
          setAddTransactionType("income");
          setAddTransactionOpen(true);
        }}
        className="fixed bottom-24 right-4 z-30 h-9 px-3.5 saree-gradient text-white shadow-xl rounded-full flex items-center gap-1.5 active:scale-95 transition cursor-pointer font-bold text-[11px] tracking-wide border border-white/20"
        aria-label="Add extra income or shop expense"
        title="Add Extra Income or Shop Expense (Booking payments are tracked automatically)"
      >
        <Plus className="size-3.5 stroke-[3]" />
        <span>+ Quick Entry</span>
      </button>

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
  serviceSplit: { drape: number; prepleat: number };
  customerKindSplit: { artist: number; client: number };
  monthlyYearlyReport: { year: string; totalCollected: number; totalBooked: number; months: { label: string; collected: number; booked: number }[] }[];
  onAddPayment?: (payment: any) => void;
  settings?: any;
  expenses?: any[];
  totalExpense?: number;
  categories?: string[];
  onDeleteExpense?: (id: string) => void;
  onEditTx?: (tx: any) => void;
}) {
  const [paymentSubTab, setPaymentSubTab] = useState<"income" | "expenses">("income");
  const [searchIncome, setSearchIncome] = useState("");
  const [searchExpense, setSearchExpense] = useState("");
  const [searchPending, setSearchPending] = useState("");
  const [pendingCategoryFilter, setPendingCategoryFilter] = useState<"all" | "prepleat" | "draping" | "high">("all");
  const [collectTarget, setCollectTarget] = useState<any | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMode, setCollectMode] = useState<PaymentMode>("gpay");
  const [collectNote, setCollectNote] = useState("Settled pending balance");
  const [recordedSuccess, setRecordedSuccess] = useState<{
    customerName: string;
    phone?: string;
    billNo: string;
    service: string;
    sareeCount: number;
    totalAmount: number;
    amountReceived: number;
    mode: PaymentMode;
    newTotalPaid: number;
    newRemainingDue: number;
  } | null>(null);

  const pendingList = useMemo(() => {
    return p.bookings
      .filter((b) => {
        if (b.status === "cancelled") return false;
        return totalDue(b) > 0;
      })
      .map((b) => {
        const c = p.customers.find((x) => x.id === b.customerId);
        const due = totalDue(b);
        const total = (b.totalAmount || 0) + (b.extraCharges || 0) - (b.discount || 0);
        return {
          booking: b,
          customer: c,
          bookingId: b.id,
          customerId: b.customerId,
          billNumber: b.billNumber,
          formattedBillNo: formatShortBillNumber(b.billNumber, b.id),
          name: c?.name || b.customerName || "Customer",
          phone: c?.phone || b.customerPhone || "",
          customerKind: c?.kind || "client",
          customerPlace: c?.place || "",
          due,
          totalAmount: total,
          advancePaid: b.advancePaid || 0,
          sareeCount: b.sareeCount || 1,
          pricePerSaree: b.pricePerSaree || 0,
          extraCharges: b.extraCharges || 0,
          extraChargesNote: b.extraChargesNote || "Travel",
          discount: b.discount || 0,
          service: b.service || "prepleat",
          deliveryDate: b.deliveryDate,
          deliveryTime: b.deliveryTime,
          completedAt: b.completedAt,
          dateStr: formatAppDate(b.deliveryDate),
        };
      })
      .sort((a, b) => b.due - a.due);
  }, [p.bookings, p.customers]);

  const filteredPending = useMemo(() => {
    return pendingList.filter((item) => {
      const q = searchPending.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.formattedBillNo.toLowerCase().includes(q) ||
        String(item.billNumber).toLowerCase().includes(q);

      if (!matchesQuery) return false;
      if (pendingCategoryFilter === "prepleat") return item.service === "prepleat";
      if (pendingCategoryFilter === "draping")
        return item.service === "drape" || item.service === "draping" || item.service === "both";
      if (pendingCategoryFilter === "high") return item.due >= 500;
      return true;
    });
  }, [pendingList, searchPending, pendingCategoryFilter]);

  const allIncomesList = useMemo(() => {
    const list: Array<{
      id: string;
      type: "booking" | "extra";
      title: string;
      subtitle: string;
      date: string;
      mode: PaymentMode;
      amount: number;
      bookingId?: string;
    }> = [];

    for (const item of p.recent) {
      const pay = item.p;
      const cust = item.c;
      const book = item.b;
      list.push({
        id: pay.id,
        type: "booking",
        title: cust?.name || "Customer",
        subtitle: book
          ? `${formatShortBillNumber(book.billNumber, book.id)} · ${book.service === "drape" ? "Drape" : "PrePleat"} · ${book.sareeCount || 1} Sarees`
          : "Order Payment",
        date: pay.date,
        mode: (pay.mode as PaymentMode) || "other",
        amount: pay.amount,
        bookingId: book?.id,
      });
    }

    for (const ext of p.recentExtra || []) {
      list.push({
        id: ext.id,
        type: "extra",
        title: ext.category || "Other Income",
        subtitle: ext.note || "Extra Income",
        date: ext.date,
        mode: ext.mode || "other",
        amount: ext.amount,
      });
    }

    list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return list;
  }, [p.recent, p.recentExtra]);

  const filteredIncomes = useMemo(() => {
    const q = searchIncome.trim().toLowerCase();
    if (!q) return allIncomesList;
    return allIncomesList.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        String(item.amount).includes(q),
    );
  }, [allIncomesList, searchIncome]);

  const filteredExpenses = useMemo(() => {
    const expensesList = (p.expenses || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const q = searchExpense.trim().toLowerCase();
    if (!q) return expensesList;
    return expensesList.filter(
      (item) =>
        (item.category || "").toLowerCase().includes(q) ||
        (item.note || "").toLowerCase().includes(q) ||
        String(item.amount).includes(q),
    );
  }, [p.expenses, searchExpense]);

  return (
    <>
      {p.subFilter === "collected" ? (
        <>
          {/* Sub-Tabs: Income vs Expense (Always Top) */}
          <div className="flex bg-secondary p-1 rounded-2xl gap-1 mb-3 card-shadow">
            <button
              type="button"
              onClick={() => setPaymentSubTab("income")}
              className={cn(
                "flex-grow py-2.5 rounded-xl text-xs font-bold active:scale-95 transition cursor-pointer text-center flex items-center justify-center gap-1.5",
                paymentSubTab === "income"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-muted-foreground hover:bg-secondary/40",
              )}
            >
              <TrendingUp className="size-3.5" />
              <span>Income ({allIncomesList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentSubTab("expenses")}
              className={cn(
                "flex-grow py-2.5 rounded-xl text-xs font-bold active:scale-95 transition cursor-pointer text-center flex items-center justify-center gap-1.5",
                paymentSubTab === "expenses"
                  ? "bg-rose-600 text-white shadow-md"
                  : "text-muted-foreground hover:bg-secondary/40",
              )}
            >
              <TrendingDown className="size-3.5" />
              <span>Expenses ({p.expenses?.length || 0})</span>
            </button>
          </div>

          {paymentSubTab === "income" ? (
            <div className="space-y-3 mb-24">
              {/* Income Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchIncome}
                  onChange={(e) => setSearchIncome(e.target.value)}
                  placeholder="Search income by customer, bill, note..."
                  className="w-full bg-card rounded-xl pl-9 pr-8 py-2 text-xs border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                />
                {searchIncome && (
                  <button
                    type="button"
                    onClick={() => setSearchIncome("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full text-muted-foreground hover:text-foreground flex items-center justify-center"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Income Transactions List */}
              {filteredIncomes.length === 0 ? (
                <div className="bg-card card-shadow rounded-2xl p-6 text-center text-muted-foreground">
                  <Wallet className="size-8 mx-auto mb-2 opacity-30 text-emerald-500" />
                  <p className="text-xs font-bold">No income entries found</p>
                </div>
              ) : (
                <div className="bg-card card-shadow rounded-2xl p-3 divide-y divide-border/20 border border-border/30">
                  {filteredIncomes.map((inc) => (
                    <div
                      key={inc.id}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-1"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={cn(
                            "size-9 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-black uppercase",
                            inc.mode === "gpay"
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : inc.mode === "cash"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-purple-500/15 text-purple-600 dark:text-purple-400",
                          )}
                        >
                          {inc.mode === "gpay" ? "UPI" : inc.mode === "cash" ? "Cash" : "Bank"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-xs text-foreground truncate">{inc.title}</p>
                            {inc.type === "extra" && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold">
                                Extra
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{inc.subtitle}</p>
                          <p className="text-[9px] text-muted-foreground/80 mt-0.5">
                            {formatAppDateTime(inc.date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                          +{fmtINR(inc.amount)}
                        </span>
                        {inc.bookingId ? (
                          <Link
                            to="/bookings/$id"
                            params={{ id: inc.bookingId }}
                            className="size-7 rounded-lg bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-95 transition"
                          >
                            <ChevronRight className="size-3.5" />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => p.onDeleteExtra(inc.id)}
                            className="size-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center active:scale-95 transition cursor-pointer"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 mb-24">
              {/* Expenses Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchExpense}
                  onChange={(e) => setSearchExpense(e.target.value)}
                  placeholder="Search expenses by category, vendor, note..."
                  className="w-full bg-card rounded-xl pl-9 pr-8 py-2 text-xs border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                />
                {searchExpense && (
                  <button
                    type="button"
                    onClick={() => setSearchExpense("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full text-muted-foreground hover:text-foreground flex items-center justify-center"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Expenses Transactions List */}
              {filteredExpenses.length === 0 ? (
                <div className="bg-card card-shadow rounded-2xl p-6 text-center text-muted-foreground">
                  <Receipt className="size-8 mx-auto mb-2 opacity-30 text-rose-500" />
                  <p className="text-xs font-bold">No expenses found</p>
                </div>
              ) : (
                <div className="bg-card card-shadow rounded-2xl p-3 divide-y divide-border/20 border border-border/30">
                  {filteredExpenses.map((exp: any) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-1 last:pb-1"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="size-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold text-xs">
                          <Tag className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-foreground truncate">{exp.category}</p>
                          {exp.note && (
                            <p className="text-[10px] text-muted-foreground truncate">{exp.note}</p>
                          )}
                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground/80 mt-0.5">
                            <span>{formatAppDate(exp.date)}</span>
                            <span className="uppercase font-bold">· {exp.mode || "cash"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-extrabold text-xs text-rose-600 dark:text-rose-400 tabular-nums">
                          -{fmtINR(exp.amount)}
                        </span>
                        {p.onEditTx && (
                          <button
                            type="button"
                            onClick={() => p.onEditTx?.({ ...exp, txType: "expense" })}
                            className="size-7 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-95 transition cursor-pointer text-[10px] font-bold"
                            title="Edit"
                          >
                            Edit
                          </button>
                        )}
                        {p.onDeleteExpense && (
                          <button
                            type="button"
                            onClick={() => p.onDeleteExpense?.(exp.id)}
                            className="size-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center active:scale-95 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
                      {/* Income & Expense Live Financial Summary Cards (Placed below transactions list) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-card card-shadow rounded-2xl p-2.5 border border-emerald-500/20 bg-gradient-to-br from-card to-emerald-500/5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9.5px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="size-2.5 text-emerald-500" /> Income
                    </span>
                    <span className="text-[8.5px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold px-1.5 py-0.2 rounded-full">
                      {allIncomesList.length} txs
                    </span>
                  </div>
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{fmtINR(p.lifetime)}
                  </p>
                  <p className="text-[8.5px] text-muted-foreground mt-0.5">
                    Avg: {fmtINR(allIncomesList.length > 0 ? Math.round(p.lifetime / allIncomesList.length) : 0)} / receipt
                  </p>
                </div>

                <div className="bg-card card-shadow rounded-2xl p-2.5 border border-rose-500/20 bg-gradient-to-br from-card to-rose-500/5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9.5px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="size-2.5 text-rose-500" /> Expenses
                    </span>
                    <span className="text-[8.5px] bg-rose-500/15 text-rose-600 dark:text-rose-400 font-extrabold px-1.5 py-0.2 rounded-full">
                      {p.expenses?.length || 0} txs
                    </span>
                  </div>
                  <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                    -{fmtINR(p.totalExpense || 0)}
                  </p>
                  <p className="text-[8.5px] text-muted-foreground mt-0.5">
                    Net: {fmtINR(p.lifetime - (p.totalExpense || 0))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Enhanced Pending Payments Hub */
        <div className="space-y-3 mb-24">
          {/* Single Unified Stats Banner for Pending Dues (Collected | Pending Due | Total Billed) */}
          <div className="bg-card card-shadow rounded-2xl p-2.5 border border-border/30">
            <div className="grid grid-cols-3 divide-x divide-border/30 text-center">
              <div className="px-1">
                <p className="text-[9px] uppercase font-bold text-muted-foreground">Collected</p>
                <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                  {fmtINR(p.lifetime)}
                </p>
              </div>
              <div className="px-1">
                <p className="text-[9px] uppercase font-bold text-destructive">Pending Due</p>
                <p className="text-xs font-black text-destructive mt-0.5 tabular-nums">
                  {fmtINR(p.totalPending)}
                </p>
              </div>
              <div className="px-1">
                <p className="text-[9px] uppercase font-bold text-muted-foreground">Total Billed</p>
                <p className="text-xs font-extrabold text-foreground mt-0.5 tabular-nums">
                  {fmtINR(p.totalBilled)}
                </p>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          {pendingList.length > 0 && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by customer, phone, or bill #..."
                  value={searchPending}
                  onChange={(e) => setSearchPending(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-card rounded-xl border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                />
                {searchPending && (
                  <button
                    onClick={() => setSearchPending("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {(
                  [
                    { id: "all", label: `All (${pendingList.length})` },
                    { id: "prepleat", label: "Pre-Pleat" },
                    { id: "draping", label: "Draping" },
                    { id: "high", label: "High Due (≥ ₹500)" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPendingCategoryFilter(f.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition cursor-pointer active:scale-95",
                      pendingCategoryFilter === f.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pending Cards List */}
          {filteredPending.length === 0 ? (
            <div className="bg-card card-shadow rounded-2xl p-8 text-center border border-border/30">
              <div className="size-12 rounded-full bg-success/15 text-success mx-auto flex items-center justify-center mb-2">
                <CheckCircle className="size-6" />
              </div>
              <p className="text-sm font-bold text-foreground mb-0.5">
                {searchPending ? "No matching pending payments found" : "All Balances Cleared!"}
              </p>
              <p className="text-xs text-muted-foreground">
                {searchPending ? "Try a different search keyword" : "All completed bookings are paid in full ✅"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((item) => {
                const serviceLabel =
                  item.service === "prepleat"
                    ? "Pre-Pleat"
                    : item.service === "drape" || item.service === "draping"
                      ? "Draping"
                      : "PrePleat + Drape";

                const bizName = p.settings?.businessName || "Saree Studio";
                const waMessage = [
                  `🥻 *${bizName.toUpperCase()}* 🥻`,
                  ``,
                  ``,
                  `Hi *${item.name}* 🙏`,
                  ``,
                  ``,
                  `Gentle reminder — balance payment is pending for your saree order.`,
                  ``,
                  ``,
                  `🧾 *Bill Number*: ${item.formattedBillNo}`,
                  `🥻 *Service*: ${serviceLabel} (${item.sareeCount} saree${item.sareeCount > 1 ? "s" : ""})`,
                  `📅 *Delivered*: ${item.dateStr}`,
                  item.extraCharges > 0
                    ? `🚗 *Extra / Travel*: ${fmtINR(item.extraCharges)} (${item.extraChargesNote})`
                    : "",
                  item.discount > 0 ? `🏷️ *Discount*: -${fmtINR(item.discount)}` : "",
                  ``,
                  ``,
                  `💰 *Total Bill*: ${fmtINR(item.totalAmount)}`,
                  `💵 *Amount Paid*: ${fmtINR(item.advancePaid)}`,
                  `📌 *Balance Due*: *${fmtINR(item.due)}*`,
                  ``,
                  ``,
                  `Pay via GPay / Cash. Thank you! 🙏`,
                  ``,
                  ``,
                  `Wear with confidence & elegance! ✨`,
                  `${bizName} 🙏`,
                ]
                  .filter((l) => l !== "")
                  .join("\n");

                return (
                  <div
                    key={item.bookingId}
                    className="bg-card card-shadow rounded-2xl p-4 border border-border/40 space-y-3 relative overflow-hidden transition hover:border-border/70"
                  >
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive via-amber-500 to-primary" />

                    {/* Card Header: Bill & Due */}
                    <div className="flex items-start justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border/40">
                          {item.formattedBillNo}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                          {serviceLabel}
                        </span>
                        {item.customerKind === "artist" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            Artist
                          </span>
                        )}
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-success/10 text-success">
                          Delivered ✅
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-destructive font-extrabold text-base tabular-nums">
                          <IndianRupee className="size-4 stroke-[2.5]" />
                          <span>{fmtINR(item.due).replace("₹", "")}</span>
                        </div>
                        <span className="text-[9px] uppercase font-bold text-destructive/80 tracking-wider">
                          Balance Due
                        </span>
                      </div>
                    </div>

                    {/* Customer & Delivery Details */}
                    <div className="flex items-center gap-3 bg-secondary/30 rounded-xl p-2.5">
                      <span className="size-9 rounded-full bg-destructive/15 text-destructive font-bold text-sm flex items-center justify-center shrink-0">
                        {item.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-sm text-foreground truncate">{item.name}</h4>
                          {item.customerPlace && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              📍 {item.customerPlace}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          Delivered: {item.dateStr} {item.deliveryTime ? `· ${item.deliveryTime}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Order Financial Breakdown */}
                    <div className="bg-secondary/50 rounded-xl p-2.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {item.sareeCount} Saree{item.sareeCount > 1 ? "s" : ""} × {fmtINR(item.pricePerSaree)}
                        </span>
                        <span className="font-medium text-foreground tabular-nums">
                          {fmtINR(item.sareeCount * item.pricePerSaree)}
                        </span>
                      </div>
                      {item.extraCharges > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>🚗 Extra ({item.extraChargesNote})</span>
                          <span className="font-medium text-foreground tabular-nums">+{fmtINR(item.extraCharges)}</span>
                        </div>
                      )}
                      {item.discount > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>🏷️ Discount</span>
                          <span className="font-medium text-destructive tabular-nums">-{fmtINR(item.discount)}</span>
                        </div>
                      )}
                      <div className="border-t border-border/30 pt-1 flex items-center justify-between text-xs font-bold">
                        <span className="text-muted-foreground">
                          Total: <span className="text-foreground">{fmtINR(item.totalAmount)}</span> · Paid:{" "}
                          <span className="text-success">{fmtINR(item.advancePaid)}</span>
                        </span>
                        <span className="text-destructive font-bold tabular-nums">Due: {fmtINR(item.due)}</span>
                      </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCollectTarget(item);
                          setCollectAmount(String(item.due));
                          setCollectMode("gpay");
                          setCollectNote("Settled pending balance");
                        }}
                        className="py-2.5 rounded-xl saree-gradient text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                      >
                        <Wallet className="size-3.5" />
                        <span>Collect {fmtINR(item.due)}</span>
                      </button>

                      {item.phone ? (
                        <a
                          href={`https://wa.me/${cleanPhoneForWhatsApp(item.phone)}?text=${encodeURIComponent(waMessage)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
                        >
                          <MessageCircle className="size-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <Link
                          to="/bookings/$id"
                          params={{ id: item.bookingId }}
                          className="py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition"
                        >
                          <FileText className="size-3.5 text-primary" />
                          <span>View Booking</span>
                        </Link>
                      )}
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/20 text-[10px]">
                      <Link
                        to="/bookings/$id"
                        params={{ id: item.bookingId }}
                        className="font-bold text-primary hover:underline flex items-center gap-1 py-1"
                      >
                        <FileText className="size-3" />
                        <span>Open Booking #{item.formattedBillNo}</span>
                      </Link>

                      {item.phone && (
                        <a
                          href={`tel:${cleanPhoneForDialing(item.phone)}`}
                          className="font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 py-1 bg-secondary/80 px-2.5 rounded-md active:scale-95 transition"
                        >
                          <Phone className="size-3 text-primary" />
                          <span>Call {item.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Collect Dialog */}
          {collectTarget && (
            <div
              className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
              onClick={() => setCollectTarget(null)}
            >
              <div
                className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4 duration-200 border border-border/40"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-border/30 pb-3">
                  <div>
                    <h3 className="font-display font-bold text-base flex items-center gap-1.5 text-foreground">
                      <Wallet className="size-4 text-primary" /> Collect Pending Balance
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {collectTarget.formattedBillNo} · {collectTarget.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setCollectTarget(null)}
                    className="size-8 rounded-full bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 active:scale-95 transition"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Due Summary Card */}
                <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-destructive tracking-wider block">
                      Total Outstanding Balance
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {collectTarget.sareeCount} saree(s) · {collectTarget.service}
                    </span>
                  </div>
                  <span className="text-xl font-extrabold text-destructive tabular-nums">
                    {fmtINR(collectTarget.due)}
                  </span>
                </div>

                {/* Amount to collect */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">
                    Amount to Collect
                  </label>
                  <div className="relative bg-secondary rounded-2xl flex items-center px-3.5 py-2.5">
                    <IndianRupee className="size-4 text-muted-foreground" />
                    <input
                      type="number"
                      value={collectAmount}
                      onChange={(e) => setCollectAmount(e.target.value)}
                      className="bg-transparent flex-1 pl-1 text-xl font-bold tabular-nums focus:outline-none"
                      placeholder={String(collectTarget.due)}
                    />
                    {Number(collectAmount) !== collectTarget.due && (
                      <button
                        type="button"
                        onClick={() => setCollectAmount(String(collectTarget.due))}
                        className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg hover:bg-primary/20 active:scale-95 transition cursor-pointer"
                      >
                        Full Due
                      </button>
                    )}
                  </div>
                </div>

                {/* Overpayment Warning */}
                {Number(collectAmount) > collectTarget.due && (
                  <div className="px-3.5 py-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold rounded-2xl flex items-center gap-2 animate-in shake duration-200">
                    <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      ⚠️ Entered amount ({fmtINR(Number(collectAmount))}) exceeds pending balance ({fmtINR(collectTarget.due)})!
                    </span>
                  </div>
                )}

                {/* Mode Selector */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block mb-1.5">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["gpay", "cash", "other"] as PaymentMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCollectMode(m)}
                        className={cn(
                          "py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer active:scale-95 text-center border",
                          collectMode === m
                            ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                            : "bg-secondary border-border/30 hover:bg-secondary/80 text-foreground/80"
                        )}
                      >
                        {m === "gpay" ? "📱 GPay" : m === "cash" ? "💵 Cash" : "💳 Other"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">
                    Payment Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={collectNote}
                    onChange={(e) => setCollectNote(e.target.value)}
                    placeholder="e.g. Settled after delivery"
                    className="w-full bg-secondary rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary border border-border/30"
                  />
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => setCollectTarget(null)}
                    className="py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase tracking-wider active:scale-95 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={Number(collectAmount) > collectTarget.due || !Number(collectAmount) || Number(collectAmount) <= 0}
                    onClick={() => {
                      const amt = Number(collectAmount);
                      if (!amt || amt <= 0) {
                        toast.error("Please enter a valid amount");
                        return;
                      }
                      if (amt > collectTarget.due) {
                        toast.error(`Amount cannot exceed pending balance of ${fmtINR(collectTarget.due)}`);
                        return;
                      }
                      if (p.onAddPayment) {
                        p.onAddPayment({
                          bookingId: collectTarget.bookingId,
                          customerId: collectTarget.customerId,
                          amount: amt,
                          mode: collectMode,
                          date: new Date().toISOString(),
                          note: collectNote.trim() || "Pending balance collected",
                        });
                      }
                      const newTotalPaid = (collectTarget.advancePaid || 0) + amt;
                      const newRemainingDue = Math.max(0, collectTarget.due - amt);

                      setRecordedSuccess({
                        customerName: collectTarget.name,
                        phone: collectTarget.phone,
                        billNo: collectTarget.formattedBillNo,
                        service: collectTarget.service === "prepleat" ? "Pre-Pleating" : "Saree Draping",
                        sareeCount: collectTarget.sareeCount,
                        totalAmount: collectTarget.totalAmount,
                        amountReceived: amt,
                        mode: collectMode,
                        newTotalPaid,
                        newRemainingDue,
                      });
                      toast.success(`Payment of ${fmtINR(amt)} recorded! ✅`);
                      setCollectTarget(null);
                    }}
                    className={cn(
                      "py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm",
                      Number(collectAmount) > collectTarget.due || !Number(collectAmount) || Number(collectAmount) <= 0
                        ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                        : "saree-gradient text-white active:scale-95 shadow-primary/10 hover:brightness-105 cursor-pointer"
                    )}
                  >
                    <Check className="size-4" />
                    <span>
                      Record {collectAmount ? fmtINR(Number(collectAmount)) : fmtINR(collectTarget.due)}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Success & WhatsApp Receipt Modal */}
          {recordedSuccess && (
            <div
              className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
              onClick={() => setRecordedSuccess(null)}
            >
              <div
                className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 border border-border/40"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center space-y-1 pt-1">
                  <div className="size-12 rounded-full bg-success/15 text-success mx-auto flex items-center justify-center">
                    <CheckCircle className="size-6" />
                  </div>
                  <h3 className="font-display font-bold text-base text-foreground">
                    Payment Recorded Successfully! 🎉
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {fmtINR(recordedSuccess.amountReceived)} collected for Bill {recordedSuccess.billNo}
                  </p>
                </div>

                {/* Receipt Summary Card */}
                <div className="bg-secondary/40 rounded-2xl p-3.5 border border-border/30 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Customer:</span>
                    <span className="font-bold text-foreground">{recordedSuccess.customerName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Payment Mode:</span>
                    <span className="font-bold uppercase text-foreground">{recordedSuccess.mode}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Total Bill:</span>
                    <span className="font-bold text-foreground">{fmtINR(recordedSuccess.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Total Paid:</span>
                    <span className="font-bold text-success">{fmtINR(recordedSuccess.newTotalPaid)}</span>
                  </div>
                  <div className="border-t border-border/30 pt-1.5 flex justify-between items-center font-bold">
                    <span>Status:</span>
                    <span className={recordedSuccess.newRemainingDue === 0 ? "text-success" : "text-destructive"}>
                      {recordedSuccess.newRemainingDue === 0
                        ? "Paid in Full ✅"
                        : `Remaining Due: ${fmtINR(recordedSuccess.newRemainingDue)}`}
                    </span>
                  </div>
                </div>

                {/* Question Prompt */}
                <p className="text-xs text-center text-muted-foreground font-medium">
                  Would you like to send the payment receipt to the customer via WhatsApp?
                </p>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRecordedSuccess(null)}
                    className="py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase tracking-wider active:scale-95 transition cursor-pointer"
                  >
                    Done / Close
                  </button>

                  {recordedSuccess.phone ? (
                    <a
                      href={`https://wa.me/${cleanPhoneForWhatsApp(recordedSuccess.phone)}?text=${encodeURIComponent(
                        [
                          `💵 *${(p.settings?.businessName || "Saree Studio").toUpperCase()}* 💵`,
                          `_Payment Confirmation Receipt_ 🧾`,
                          ``,
                          `Hi *${recordedSuccess.customerName}* 🙏`,
                          `Payment received successfully! Thank you! ✨`,
                          ``,
                          `🧾 *RECEIPT SUMMARY*`,
                          `• *Bill No*: ${recordedSuccess.billNo}`,
                          `• *Service*: ${recordedSuccess.service} (${recordedSuccess.sareeCount} saree${recordedSuccess.sareeCount > 1 ? "s" : ""})`,
                          ``,
                          `💰 *TRANSACTION DETAILS*`,
                          `• *Amount Received*: ${fmtINR(recordedSuccess.amountReceived)} (${recordedSuccess.mode.toUpperCase()})`,
                          `• *Total Paid*: ${fmtINR(recordedSuccess.newTotalPaid)} / ${fmtINR(recordedSuccess.totalAmount)}`,
                          recordedSuccess.newRemainingDue === 0
                            ? `• *Status*: ✅ *Paid in Full* ✅`
                            : `• *Remaining Balance*: *${fmtINR(recordedSuccess.newRemainingDue)}*`,
                          ``,
                          `✨ _Wear with confidence & elegance!_`,
                          `🙏 *${p.settings?.businessName || "Saree Studio"}*`,
                        ].join("\n")
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setRecordedSuccess(null)}
                      className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider active:scale-95 transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle className="size-4" />
                      <span>Send WhatsApp</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        toast.error("No phone number available for WhatsApp");
                        setRecordedSuccess(null);
                      }}
                      className="py-3 rounded-xl bg-secondary text-muted-foreground text-xs font-bold uppercase tracking-wider"
                    >
                      No Phone
                    </button>
                  )}
                </div>
              </div>
            </div>
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
  onViewPending?: () => void;
}) {
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const payments = useStore((s) => s.payments);

  const margin = p.lifetime > 0 ? Math.round((p.netProfit / p.lifetime) * 100) : 0;

  const [dateFilter, setDateFilter] = useState<string>("all"); // "all" or "yyyy-MM"
  const [summarySubTab, setSummarySubTab] = useState<"overview" | "services" | "clients" | "modes">("overview");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const t of p.allTimeTrend || []) {
      if (t.month && t.month.length >= 4) {
        years.add(t.month.slice(0, 4));
      }
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [p.allTimeTrend]);

  // Compute period-specific analytics
  const periodData = useMemo(() => {
    const months = (p.allTimeTrend || []).filter((m) =>
      selectedYear === "all" ? true : m.month.startsWith(selectedYear),
    );
    const validMonths = months.filter((m) => m.amount > 0 || m.expense > 0);
    const income = months.reduce((s, m) => s + m.amount, 0);
    const expense = months.reduce((s, m) => s + m.expense, 0);
    const net = income - expense;
    const marginPct = income > 0 ? Math.round((net / income) * 100) : 0;

    const sortedByIncome = [...validMonths].sort((a, b) => b.amount - a.amount);
    const peak = sortedByIncome.length > 0 ? sortedByIncome[0] : null;
    const slowest = sortedByIncome.length > 0 ? sortedByIncome[sortedByIncome.length - 1] : null;
    const avgMonthly = validMonths.length > 0 ? Math.round(income / validMonths.length) : 0;
    const avgDaily = validMonths.length > 0 ? Math.round(income / (validMonths.length * 30)) : 0;

    return {
      months,
      validMonths,
      income,
      expense,
      net,
      marginPct,
      peak,
      slowest,
      avgMonthly,
      avgDaily,
    };
  }, [p.allTimeTrend, selectedYear]);

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

  // Single latest milestone badge
  const latestMilestone = useMemo(() => {
    const list = [25000, 50000, 75000, 100000, 150000, 200000, 300000, 500000, 1000000];
    const achieved = list.filter((v) => v <= lifetimeCumulative);
    return achieved.length > 0 ? achieved[achieved.length - 1] : null;
  }, [lifetimeCumulative]);

  const trendDataWithCumulative = useMemo(() => {
    const list = p.trend12 || [];
    let cumulative = 0;
    return list.map((item) => {
      cumulative += item.amount;
      return {
        ...item,
        cumulative,
      };
    });
  }, [p.trend12]);

  return (
    <>
      {/* 📈 Monthly Stacked Bars + Cumulative Line Chart */}
      <div className="bg-card card-shadow rounded-2xl p-3.5 mb-3 border border-border/40">
        {/* Single Smart Header Line */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 truncate">
            <TrendingUp className="size-3.5 text-primary shrink-0" /> Revenue & Trend
          </p>
          <div className="flex items-center gap-2 text-[8.5px] font-bold shrink-0">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-xs bg-emerald-500 inline-block" /> Income
            </span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <span className="size-1.5 rounded-xs bg-rose-500 inline-block" /> Expense
            </span>
            <span className="flex items-center gap-1 text-primary">
              <span className="size-1.5 rounded-full bg-primary inline-block" /> Cumulative
            </span>
          </div>
        </div>

        <div className="h-44 w-full -mx-1">
          {trendDataWithCumulative.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No financial data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendDataWithCumulative} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12} />
                <XAxis dataKey="month" stroke="currentColor" opacity={0.6} fontSize={10} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  stroke="currentColor"
                  opacity={0.6}
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="currentColor"
                  opacity={0.4}
                  fontSize={9}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload || {};
                      const inc = Number(data.amount) || 0;
                      const exp = Number(data.expense) || 0;
                      const net = inc - exp;
                      const cum = Number(data.cumulative) || 0;
                      return (
                        <div className="rounded-xl bg-card border border-border p-2.5 shadow-xl text-xs space-y-1">
                          <p className="font-bold text-foreground border-b border-border/40 pb-1">{label}</p>
                          <p className="text-emerald-600 font-semibold flex justify-between gap-4">
                            <span>Income (Bar):</span> <strong>+{fmtINR(inc)}</strong>
                          </p>
                          <p className="text-rose-600 font-semibold flex justify-between gap-4">
                            <span>Expense (Bar):</span> <strong>-{fmtINR(exp)}</strong>
                          </p>
                          <p
                            className={cn(
                              "font-bold pt-1 border-t border-border/30 flex justify-between gap-4",
                              net >= 0 ? "text-primary" : "text-destructive",
                            )}
                          >
                            <span>Net Profit:</span> <strong>{fmtINR(net)}</strong>
                          </p>
                          <p className="text-primary font-bold pt-1 border-t border-border/30 flex justify-between gap-4">
                            <span>Cumulative Total:</span> <strong>{fmtINR(cum)}</strong>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="amount"
                  name="Income"
                  stackId="monthlyBar"
                  fill="#10b981"
                  barSize={14}
                  radius={[0, 0, 2, 2]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="expense"
                  name="Expense"
                  stackId="monthlyBar"
                  fill="#f43f5e"
                  barSize={14}
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  name="Cumulative"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ r: 1.2, fill: "var(--color-primary)" }}
                  activeDot={{ r: 3.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Single Latest Milestone badge */}
        {latestMilestone && (
          <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between">
            <span className="text-[9.5px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              🎉 Latest Milestone: {latestMilestone >= 100000 ? `₹${latestMilestone / 100000} Lakh` : `₹${latestMilestone / 1000}k`} Lifetime Revenue!
            </span>
          </div>
        )}
      </div>

      {/* Summary Sub-Tabs Navigation & Year Period Selector */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="flex-1 flex bg-secondary p-1 rounded-2xl gap-1 card-shadow overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSummarySubTab("overview")}
            className={cn(
              "flex-1 min-w-[65px] py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer text-center",
              summarySubTab === "overview"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            📊 Overview
          </button>
          <button
            type="button"
            onClick={() => setSummarySubTab("services")}
            className={cn(
              "flex-1 min-w-[65px] py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer text-center",
              summarySubTab === "services"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            🥻 Services
          </button>
          <button
            type="button"
            onClick={() => setSummarySubTab("clients")}
            className={cn(
              "flex-1 min-w-[65px] py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer text-center",
              summarySubTab === "clients"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            👑 VIPs
          </button>
          <button
            type="button"
            onClick={() => setSummarySubTab("modes")}
            className={cn(
              "flex-1 min-w-[65px] py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer text-center",
              summarySubTab === "modes"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            💳 Cash
          </button>
        </div>

        {/* Year Filter Pill */}
        {availableYears.length > 1 && (
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-[10px] font-bold bg-card border border-border/40 rounded-2xl px-2 py-2 text-foreground cursor-pointer outline-none shrink-0"
          >
            <option value="all">All Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* SUB-TAB 1: 📊 Overview & Performance */}
      {summarySubTab === "overview" && (
        <div className="space-y-3 mb-24 animate-in fade-in">
          {/* Compact 4-Stat Grid */}
          <div className="grid grid-cols-2 gap-2">
            <Stat
              tint="success"
              icon={<Wallet className="size-3" />}
              label="Income"
              value={fmtINR(selectedYear === "all" ? p.lifetime : periodData.income)}
            />
            <Stat
              tint="danger"
              icon={<Receipt className="size-3" />}
              label="Expense"
              value={fmtINR(selectedYear === "all" ? p.totalExpense : periodData.expense)}
            />
            <Stat
              tint="primary"
              icon={<TrendingUp className="size-3" />}
              label="Net profit"
              value={fmtINR(selectedYear === "all" ? p.netProfit : periodData.net)}
            />
            <Stat
              tint="muted"
              icon={<IndianRupee className="size-3" />}
              label="Margin"
              value={`${selectedYear === "all" ? margin : periodData.marginPct}%`}
            />
          </div>

          {/* Performance Highlights (Peak, Slowest, Avg/Mo, Avg/Day) */}
          {periodData.validMonths.length > 0 && (
            <div className="bg-card card-shadow rounded-2xl p-3 border border-border/30">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">
                Monthly Performance Benchmarks
              </p>
              <div className="grid grid-cols-2 gap-2">
                {/* Peak Month */}
                {periodData.peak && (
                  <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-2">
                    <span className="text-[8.5px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">
                      🔥 Best Performing Month
                    </span>
                    <p className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                      +{fmtINR(periodData.peak.amount)}
                    </p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">{periodData.peak.month}</p>
                  </div>
                )}

                {/* Slowest Month */}
                {periodData.slowest && (
                  <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl p-2">
                    <span className="text-[8.5px] uppercase font-bold text-amber-700 dark:text-amber-300 block">
                      🔻 Slowest / Low Month
                    </span>
                    <p className="font-extrabold text-xs text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                      {fmtINR(periodData.slowest.amount)}
                    </p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">{periodData.slowest.month}</p>
                  </div>
                )}

                {/* Avg Per Month */}
                <div className="bg-primary/8 border border-primary/15 rounded-xl p-2">
                  <span className="text-[8.5px] uppercase font-bold text-primary block">
                    📈 Monthly Average
                  </span>
                  <p className="font-extrabold text-xs text-primary tabular-nums mt-0.5">
                    {fmtINR(periodData.avgMonthly)}
                  </p>
                  <p className="text-[8px] text-muted-foreground mt-0.5">{periodData.validMonths.length} active mos</p>
                </div>

                {/* Daily Earning */}
                <div className="bg-secondary/60 border border-border/30 rounded-xl p-2">
                  <span className="text-[8.5px] uppercase font-bold text-muted-foreground block">
                    ⚡ Daily Run-Rate
                  </span>
                  <p className="font-extrabold text-xs text-foreground tabular-nums mt-0.5">
                    ~{fmtINR(periodData.avgDaily)} / day
                  </p>
                  <p className="text-[8px] text-muted-foreground mt-0.5">{periodData.validMonths.length * 30} days est.</p>
                </div>
              </div>
            </div>
          )}

          {/* Month-by-Month Comparative Ledger */}
          {periodData.validMonths.length > 0 && (
            <div className="bg-card card-shadow rounded-2xl p-3 border border-border/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Month-by-Month Analysis
                </p>
                <span className="text-[9px] text-muted-foreground">
                  {periodData.validMonths.length} Months Tracked
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                {[...periodData.validMonths]
                  .sort((a, b) => b.month.localeCompare(a.month))
                  .map((m, idx) => {
                    const isProfitable = m.net >= 0;
                    const mMargin = m.amount > 0 ? Math.round((m.net / m.amount) * 100) : 0;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-secondary/35 border border-border/15 text-xs"
                      >
                        <div>
                          <p className="font-bold text-foreground">{m.month}</p>
                          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.2">
                            <span className="text-emerald-600 font-semibold">+{fmtINR(m.amount)}</span>
                            <span>·</span>
                            <span className="text-rose-600 font-semibold">-{fmtINR(m.expense)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              "font-black text-xs tabular-nums",
                              isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                            )}
                          >
                            {fmtINR(m.net)}
                          </p>
                          <span
                            className={cn(
                              "text-[8px] font-bold px-1.5 py-0.2 rounded-full inline-block mt-0.5",
                              isProfitable
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-destructive/10 text-destructive",
                            )}
                          >
                            {mMargin}% margin
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Collection Health Progress */}
          <div className="bg-card card-shadow rounded-2xl p-3 border border-border/30">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Collection Health
              </p>
              <p className="text-[10px] font-extrabold text-foreground tabular-nums">
                {p.collectionRate}% Cleared
              </p>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-secondary flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${p.collectionRate}%` }} />
              <div
                className="bg-destructive/60 h-full"
                style={{ width: `${100 - p.collectionRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[9.5px] text-muted-foreground">
              <span>
                Paid: <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtINR(p.lifetime)}</span>
              </span>
              <span>
                Pending: <span className="font-bold text-destructive tabular-nums">{fmtINR(p.totalPending)}</span>
              </span>
            </div>
          </div>

          {/* Top Sources */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card card-shadow rounded-2xl p-2.5 border border-border/30">
              <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground font-bold">
                Top Income Source
              </p>
              {p.incomeByCategory.length > 0 ? (
                <div className="mt-1">
                  <p className="font-bold text-xs truncate text-emerald-600 dark:text-emerald-400">
                    {p.incomeByCategory[0].cat}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
                    {fmtINR(p.incomeByCategory[0].amount)} ({p.incomeByCategory[0].pct}%)
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-1">No earnings yet</p>
              )}
            </div>

            <div className="bg-card card-shadow rounded-2xl p-2.5 border border-border/30">
              <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground font-bold">
                Top Spending
              </p>
              {p.expenseByCategory.length > 0 ? (
                <div className="mt-1">
                  <p className="font-bold text-xs truncate text-rose-600 dark:text-rose-400">
                    {p.expenseByCategory[0].cat}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
                    {fmtINR(p.expenseByCategory[0].amount)} ({p.expenseByCategory[0].pct}%)
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-1">No expenses yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: 🥻 Services & Volume */}
      {summarySubTab === "services" && (
        <div className="space-y-3 mb-24 animate-in fade-in">
          {(() => {
            const filteredBookings = bookings.filter((b) => {
              if (b.status === "cancelled") return false;
              if (selectedYear === "all") return true;
              return b.deliveryDate.startsWith(selectedYear);
            });

            const prepleatBookings = filteredBookings.filter((b) => b.service === "prepleat");
            const drapeBookings = filteredBookings.filter((b) => b.service === "drape");
            const totalValidSarees = filteredBookings.reduce((s, b) => s + (b.sareeCount || 1), 0);
            const prepleatSarees = prepleatBookings.reduce((s, b) => s + (b.sareeCount || 1), 0);
            const drapeSarees = drapeBookings.reduce((s, b) => s + (b.sareeCount || 1), 0);
            const prepleatPct = totalValidSarees > 0 ? Math.round((prepleatSarees / totalValidSarees) * 100) : 0;
            const drapePct = totalValidSarees > 0 ? Math.round((drapeSarees / totalValidSarees) * 100) : 0;

            const prepleatRevenue = prepleatBookings.reduce((s, b) => s + b.totalAmount, 0);
            const drapeRevenue = drapeBookings.reduce((s, b) => s + b.totalAmount, 0);
            const totalRevenue = prepleatRevenue + drapeRevenue;
            const avgSareePrice = totalValidSarees > 0 ? Math.round(totalRevenue / totalValidSarees) : 0;
            const avgSareesPerBooking = filteredBookings.length > 0 ? (totalValidSarees / filteredBookings.length).toFixed(1) : "0";

            const totalExtraCharges = filteredBookings.reduce((s, b) => s + (b.extraCharges || 0), 0);
            const totalDiscounts = filteredBookings.reduce((s, b) => s + (b.discount || 0), 0);

            return (
              <>
                <div className="bg-card card-shadow rounded-2xl p-3 border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Saree Service Volume & Share {selectedYear !== "all" ? `(${selectedYear})` : ""}
                    </p>
                    <span className="text-[9.5px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      {totalValidSarees} Total Sarees
                    </span>
                  </div>

                  {/* Visual split bar */}
                  <div className="h-2 rounded-full overflow-hidden bg-secondary flex mb-2.5">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${prepleatPct}%` }}
                    />
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${drapePct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2">
                      <span className="text-[8.5px] uppercase font-bold text-amber-700 dark:text-amber-300 block">
                        Pre-Pleat
                      </span>
                      <span className="text-xs font-black text-foreground tabular-nums">
                        {prepleatSarees} ({prepleatPct}%)
                      </span>
                      <p className="text-[8px] text-muted-foreground mt-0.5">{fmtINR(prepleatRevenue)}</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2">
                      <span className="text-[8.5px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">
                        Direct Drape
                      </span>
                      <span className="text-xs font-black text-foreground tabular-nums">
                        {drapeSarees} ({drapePct}%)
                      </span>
                      <p className="text-[8px] text-muted-foreground mt-0.5">{fmtINR(drapeRevenue)}</p>
                    </div>
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-2">
                      <span className="text-[8.5px] uppercase font-bold text-primary block">
                        Avg / Saree
                      </span>
                      <span className="text-xs font-black text-primary tabular-nums">
                        {fmtINR(avgSareePrice)}
                      </span>
                      <p className="text-[8px] text-muted-foreground mt-0.5">Realization</p>
                    </div>
                  </div>
                </div>

                {/* Saree Metrics & Add-ons Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-card card-shadow rounded-2xl p-2.5 border border-border/30">
                    <span className="text-[9.5px] uppercase font-bold text-muted-foreground block">
                      🥻 Saree Density
                    </span>
                    <p className="text-sm font-extrabold text-foreground mt-1 tabular-nums">
                      ~{avgSareesPerBooking} sarees
                    </p>
                    <p className="text-[8.5px] text-muted-foreground mt-0.5">Avg per booking order</p>
                  </div>
                  <div className="bg-card card-shadow rounded-2xl p-2.5 border border-border/30">
                    <span className="text-[9.5px] uppercase font-bold text-muted-foreground block">
                      🚗 Travel / Extra Charges
                    </span>
                    <p className="text-sm font-extrabold text-foreground mt-1 tabular-nums">
                      +{fmtINR(totalExtraCharges)}
                    </p>
                    <p className="text-[8.5px] text-muted-foreground mt-0.5">Collected from bookings</p>
                  </div>
                  <div className="bg-card card-shadow rounded-2xl p-2.5 border border-border/30 col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-muted-foreground block">
                          🏷️ Total Client Savings & Discounts
                        </span>
                        <p className="text-sm font-extrabold text-destructive mt-0.5 tabular-nums">
                          -{fmtINR(totalDiscounts)}
                        </p>
                      </div>
                      <span className="text-[9px] font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                        {filteredBookings.filter((b) => (b.discount || 0) > 0).length} discounted orders
                      </span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* SUB-TAB 3: 👑 VIP Clients & Retention */}
      {summarySubTab === "clients" && (
        <div className="space-y-3 mb-24 animate-in fade-in">
          {(() => {
            const filteredBookings = bookings.filter((b) => {
              if (b.status === "cancelled") return false;
              if (selectedYear === "all") return true;
              return b.deliveryDate.startsWith(selectedYear);
            });

            const custStats = new Map<string, { name: string; phone?: string; sareeCount: number; spent: number; bookingCount: number }>();
            let directCount = 0;
            let artistCount = 0;

            for (const b of filteredBookings) {
              if (b.artistId) artistCount++;
              else directCount++;

              const c = customers.find((x) => x.id === b.customerId);
              const name = c?.name || "Client";
              const phone = c?.phone;
              const key = b.customerId || name;
              const ex = custStats.get(key) || { name, phone, sareeCount: 0, spent: 0, bookingCount: 0 };
              ex.sareeCount += b.sareeCount || 1;
              ex.spent += b.totalAmount || 0;
              ex.bookingCount += 1;
              custStats.set(key, ex);
            }

            const allClients = Array.from(custStats.values());
            const top5 = [...allClients]
              .sort((a, b) => b.spent - a.spent || b.sareeCount - a.sareeCount)
              .slice(0, 5);

            const repeatClients = allClients.filter((c) => c.bookingCount > 1);
            const repeatRate = allClients.length > 0 ? Math.round((repeatClients.length / allClients.length) * 100) : 0;
            const totalBookingsCount = directCount + artistCount;
            const directPct = totalBookingsCount > 0 ? Math.round((directCount / totalBookingsCount) * 100) : 0;
            const artistPct = totalBookingsCount > 0 ? Math.round((artistCount / totalBookingsCount) * 100) : 0;

            return (
              <>
                {/* Acquisition & Retention Stats */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-card card-shadow rounded-2xl p-2.5 border border-border/30">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                      🔁 Client Repeat Rate
                    </span>
                    <p className="text-sm font-extrabold text-primary mt-1 tabular-nums">
                      {repeatRate}%
                    </p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">{repeatClients.length} repeat clients</p>
                  </div>
                  <div className="bg-card card-shadow rounded-2xl p-2.5 border border-border/30">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                      👥 Active Client Base
                    </span>
                    <p className="text-sm font-extrabold text-foreground mt-1 tabular-nums">
                      {allClients.length} clients
                    </p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">{totalBookingsCount} bookings</p>
                  </div>
                </div>

                {/* Acquisition Channel Breakdown */}
                <div className="bg-card card-shadow rounded-2xl p-3 border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Booking Referral Channels
                    </p>
                    <span className="text-[9.5px] font-bold text-muted-foreground">
                      {totalBookingsCount} Total Orders
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-secondary/40 rounded-xl p-2 border border-border/20">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                        Direct Walk-in
                      </span>
                      <p className="text-sm font-extrabold text-foreground tabular-nums">
                        {directCount} ({directPct}%)
                      </p>
                    </div>
                    <div className="bg-indigo-500/10 rounded-xl p-2 border border-indigo-500/20">
                      <span className="text-[9px] uppercase font-bold text-indigo-700 dark:text-indigo-300 block">
                        Artist Referrals
                      </span>
                      <p className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300 tabular-nums">
                        {artistCount} ({artistPct}%)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Top VIP Clients Leaderboard */}
                <div className="bg-card card-shadow rounded-2xl p-3 border border-border/30">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-2.5">
                    <Crown className="size-3.5 text-amber-500" /> Top VIP Repeat Customers
                  </p>
                  <div className="space-y-1.5">
                    {top5.map((cust, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-secondary/30 border border-border/15"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              "size-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0",
                              idx === 0
                                ? "bg-amber-400 text-amber-950 shadow-2xs"
                                : idx === 1
                                ? "bg-slate-300 text-slate-900"
                                : idx === 2
                                ? "bg-amber-700/30 text-amber-900 dark:text-amber-200"
                                : "bg-secondary text-muted-foreground",
                            )}
                          >
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{cust.name}</p>
                            <p className="text-[9.5px] text-muted-foreground">{cust.sareeCount} sarees draped</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {fmtINR(cust.spent)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* SUB-TAB 4: 💳 Modes & Cash Flow */}
      {summarySubTab === "modes" && (
        <div className="space-y-3 mb-24 animate-in fade-in">
          {/* Payment Collection Modes Breakdown */}
          {(() => {
            let gpayTotal = 0;
            let cashTotal = 0;
            let otherTotal = 0;
            for (const pmt of payments) {
              if (selectedYear !== "all" && pmt.date && !pmt.date.startsWith(selectedYear)) continue;
              if (pmt.mode === "gpay" || pmt.mode === "upi" || pmt.mode === "online") gpayTotal += pmt.amount;
              else if (pmt.mode === "cash") cashTotal += pmt.amount;
              else otherTotal += pmt.amount;
            }
            const totalCollected = gpayTotal + cashTotal + otherTotal;
            const gpayPct = totalCollected > 0 ? Math.round((gpayTotal / totalCollected) * 100) : 0;
            const cashPct = totalCollected > 0 ? Math.round((cashTotal / totalCollected) * 100) : 0;

            return (
              <div className="bg-card card-shadow rounded-2xl p-3 border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Payment Collection Modes {selectedYear !== "all" ? `(${selectedYear})` : ""}
                  </p>
                  <span className="text-[9.5px] font-extrabold text-foreground tabular-nums">
                    Total {fmtINR(totalCollected)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col justify-between">
                    <span className="text-[9.5px] font-bold text-blue-600">📱 UPI / GPay / Digital</span>
                    <p className="text-sm font-extrabold text-blue-700 mt-1 tabular-nums">
                      {fmtINR(gpayTotal)}{" "}
                      <span className="text-[9px] font-medium opacity-80">({gpayPct}%)</span>
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
                    <span className="text-[9.5px] font-bold text-emerald-600">💵 Cash</span>
                    <p className="text-sm font-extrabold text-emerald-700 mt-1 tabular-nums">
                      {fmtINR(cashTotal)}{" "}
                      <span className="text-[9px] font-medium opacity-80">({cashPct}%)</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Unified Recent Cash Flow Timeline */}
          <div className="bg-card card-shadow rounded-2xl p-3 border border-border/30">
            {/* Date filter header */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Cash Flow Stream
              </p>
              <div className="flex items-center gap-1.5">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="text-[9.5px] font-semibold bg-secondary border border-border rounded-lg px-2 py-1 text-foreground cursor-pointer outline-none"
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
                <div className="max-h-[360px] overflow-y-auto pr-1">
                  {/* filtered summary row */}
                  {dateFilter !== "all" && (
                    <div className="flex justify-between text-[9.5px] font-semibold mb-2 px-1">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        In:{" "}
                        {fmtINR(
                          filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
                        )}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400">
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
                  <ul className="space-y-2 relative border-l border-border pl-3 ml-2">
                    {filtered.map((tx) => {
                      const isInc = tx.type === "income";
                      return (
                        <li key={tx.id} className="relative">
                          <div
                            className={cn(
                              "absolute -left-[16px] top-1.5 size-2 rounded-full border bg-card",
                              isInc ? "border-emerald-500 bg-emerald-500" : "border-rose-500 bg-rose-500",
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => p.onEditTx(tx)}
                            className="w-full text-left flex items-center justify-between gap-2.5 bg-secondary/35 hover:bg-secondary/60 p-2 rounded-xl transition cursor-pointer"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "px-1 py-0.2 rounded text-[7.5px] font-black uppercase shrink-0",
                                    isInc
                                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                                  )}
                                >
                                  {isInc ? "In" : "Out"}
                                </span>
                                <p className="font-semibold text-xs truncate text-foreground">
                                  {tx.customerName || tx.category}
                                </p>
                              </div>
                              <p className="text-[9px] text-muted-foreground truncate mt-0.5">
                                {tx.customerName ? `${tx.category} · ` : ""}
                                {formatAppDateTime(tx.date)}
                                {tx.note ? ` · ${tx.note}` : ""}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p
                                className={cn(
                                  "font-extrabold text-xs tabular-nums",
                                  isInc ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                                )}
                              >
                                {isInc ? "+" : "-"}
                                {fmtINR(tx.amount)}
                              </p>
                              {tx.mode && (
                                <span className="text-[8.5px] uppercase font-semibold text-muted-foreground block leading-none mt-0.5">
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
        </div>
      )}
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
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="bg-transparent flex-1 pl-1 text-2xl font-bold tabular-nums focus:outline-none" />
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

        {/* Warning card for booking payment */}
        {tx.sourceType === "booking_payment" && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-amber-500 animate-in fade-in duration-200">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider">Booking Payment Update</p>
              <p className="text-[11px] leading-tight opacity-90 mt-0.5">
                Saving changes will update the booking's paid amount & status. If you delete this payment, the booking will revert to pending.
              </p>
            </div>
          </div>
        )}

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
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3
              className={cn(
                "font-display font-bold text-base transition-colors duration-300",
                isIncome ? "text-success" : "text-destructive",
              )}
            >
              Log Extra {isIncome ? "Income" : "Expense"}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              For manual extra earnings & shop spending only (Order payments are automatically recorded).
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition cursor-pointer shrink-0"
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
        ? "text-emerald-600 dark:text-emerald-400"
        : tint === "danger"
          ? "text-destructive"
          : "text-muted-foreground";
  return (
    <div className="bg-card card-shadow rounded-2xl p-2.5 border border-border/30">
      <div
        className={`flex items-center gap-1 text-[9.5px] uppercase tracking-wider font-bold ${tintCls}`}
      >
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-base font-display font-extrabold mt-0.5 tabular-nums text-foreground">{value}</p>
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
  sub?: string;
  tint?: "primary" | "success" | "danger";
}) {
  const tintCls =
    tint === "primary"
      ? "text-primary bg-primary/10"
      : tint === "success"
        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
        : tint === "danger"
          ? "text-destructive bg-destructive/10"
          : "text-muted-foreground bg-secondary";
  return (
    <div className="bg-card card-shadow rounded-2xl p-2.5 border border-border/30">
      <div className="flex items-center justify-between">
        <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
        <span className={`p-1 rounded-lg ${tintCls}`}>{icon}</span>
      </div>
      <p className="text-sm font-display font-extrabold mt-1 tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-[8.5px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
