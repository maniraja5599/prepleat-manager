import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, fmtINR, totalDue } from "@/lib/store";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths } from "date-fns";
import { Search, IndianRupee, ChevronLeft, ChevronRight, TrendingUp, AlertCircle, Wallet, Calendar as CalIcon, Trash2, Download, FileText, SlidersHorizontal, X as XIcon } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
type StatusFilter = "all" | "paid" | "due";
type RangeMode = "month" | "custom";

const rs = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");

function PaymentsPage() {
  const payments = useStore((s) => s.payments);
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const businessName = useStore((s) => s.settings.businessName);
  const deletePayment = useStore((s) => s.deletePayment);

  const [tab, setTab] = useState<Tab>("log");
  const [monthRef, setMonthRef] = useState(new Date());
  const [rangeMode, setRangeMode] = useState<RangeMode>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const bounds = useMemo(() => {
    if (rangeMode === "custom") {
      return {
        start: from ? new Date(from + "T00:00:00") : new Date(0),
        end: to ? new Date(to + "T23:59:59") : new Date(8640000000000000),
        label: `${from || "…"} → ${to || "…"}`,
      };
    }
    return { start: startOfMonth(monthRef), end: endOfMonth(monthRef), label: format(monthRef, "MMMM yyyy") };
  }, [rangeMode, monthRef, from, to]);

  const rangedPayments = useMemo(
    () => payments.filter((p) => isWithinInterval(parseISO(p.date), { start: bounds.start, end: bounds.end })),
    [payments, bounds],
  );

  const activeFilterCount = (status !== "all" ? 1 : 0) + (minAmt ? 1 : 0) + (maxAmt ? 1 : 0) + (rangeMode === "custom" ? 1 : 0);

  // Filter payments by status (via booking due), amount, search
  const filteredPayments = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const min = minAmt ? Number(minAmt) : -Infinity;
    const max = maxAmt ? Number(maxAmt) : Infinity;
    return rangedPayments.filter((p) => {
      if (p.amount < min || p.amount > max) return false;
      const c = customers.find((x) => x.id === p.customerId);
      if (ql && !(c?.name.toLowerCase().includes(ql) || c?.phone.includes(ql))) return false;
      if (status !== "all") {
        const b = bookings.find((x) => x.id === p.bookingId);
        const due = b ? totalDue(b) : 0;
        if (status === "paid" && due > 0) return false;
        if (status === "due" && due === 0) return false;
      }
      return true;
    });
  }, [rangedPayments, q, minAmt, maxAmt, status, customers, bookings]);

  const collected = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const totalPending = bookings.reduce((s, b) => s + totalDue(b), 0);
  const lifetime = payments.reduce((s, p) => s + p.amount, 0);
  const rangedBilled = bookings
    .filter((b) => isWithinInterval(parseISO(b.deliveryDate), { start: bounds.start, end: bounds.end }))
    .reduce((s, b) => s + b.totalAmount, 0);
  const rangedPaidVsBilled = rangedBilled > 0 ? Math.min(100, Math.round((collected / rangedBilled) * 100)) : 0;

  // Daily chart for filtered range
  const dailyChart = useMemo(() => {
    const map = new Map<string, number>();
    filteredPayments.forEach((p) => {
      const k = p.date.slice(0, 10);
      map.set(k, (map.get(k) ?? 0) + p.amount);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, v]) => ({ day: format(parseISO(d), "MMM d"), amount: v }));
  }, [filteredPayments]);

  const modeSplit = useMemo(() => {
    const m: Record<string, number> = { gpay: 0, cash: 0, other: 0 };
    filteredPayments.forEach((p) => { m[p.mode ?? "other"] = (m[p.mode ?? "other"] ?? 0) + p.amount; });
    return m;
  }, [filteredPayments]);

  // Customer-wise — scoped to the same range/filters
  const customerSummary = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const min = minAmt ? Number(minAmt) : -Infinity;
    const max = maxAmt ? Number(maxAmt) : Infinity;
    const rows = customers.map((c) => {
      const cb = bookings.filter(
        (b) =>
          (b.customerId === c.id || b.artistId === c.id) &&
          isWithinInterval(parseISO(b.deliveryDate), { start: bounds.start, end: bounds.end }),
      );
      const cp = filteredPayments.filter((p) => p.customerId === c.id);
      const billed = cb.reduce((s, b) => s + b.totalAmount, 0);
      const paid = cp.reduce((s, p) => s + p.amount, 0);
      const due = cb.reduce((s, b) => s + totalDue(b), 0);
      const lastPay = cp.sort((a, b) => b.date.localeCompare(a.date))[0];
      return { c, billed, paid, due, count: cb.length, lastPay };
    }).filter((r) => r.count > 0 || r.paid > 0);
    return rows
      .filter((r) => !ql || r.c.name.toLowerCase().includes(ql) || r.c.phone.includes(ql))
      .filter((r) => r.paid >= min && r.paid <= max)
      .filter((r) => status === "all" || (status === "paid" ? r.due === 0 : r.due > 0))
      .sort((a, b) => b.due - a.due || b.paid - a.paid);
  }, [customers, bookings, filteredPayments, q, minAmt, maxAmt, status, bounds]);

  const searchedTotals = customerSummary.reduce(
    (acc, r) => ({ billed: acc.billed + r.billed, paid: acc.paid + r.paid, due: acc.due + r.due }),
    { billed: 0, paid: 0, due: 0 },
  );

  const logList = useMemo(() => {
    return filteredPayments
      .map((p) => ({
        p,
        c: customers.find((x) => x.id === p.customerId),
        b: bookings.find((x) => x.id === p.bookingId),
      }))
      .sort((a, b) => b.p.date.localeCompare(a.p.date));
  }, [filteredPayments, customers, bookings]);

  const clearFilters = () => { setStatus("all"); setMinAmt(""); setMaxAmt(""); setRangeMode("month"); setFrom(""); setTo(""); };

  // ========= Exports =========
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
    const rangeLabel = bounds.label.replace(/[^a-z0-9]+/gi, "-");
    if (tab === "customer") {
      const header = ["Customer", "Phone", "Kind", "Bookings", "Billed", "Paid", "Due", "Last Payment"];
      const rows = customerSummary.map((r) => [
        r.c.name, r.c.phone, r.c.kind, r.count, r.billed, r.paid, r.due,
        r.lastPay ? format(parseISO(r.lastPay.date), "yyyy-MM-dd") : "",
      ]);
      rows.push(["TOTAL", "", "", "", searchedTotals.billed, searchedTotals.paid, searchedTotals.due, ""]);
      const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
      downloadBlob(csv, `payments-customers-${rangeLabel}.csv`, "text/csv;charset=utf-8");
    } else {
      const header = ["Date", "Customer", "Phone", "Booking", "Service", "Mode", "Amount", "Note"];
      const rows = logList.map(({ p, c, b }) => [
        format(parseISO(p.date), "yyyy-MM-dd HH:mm"),
        c?.name ?? "Unknown", c?.phone ?? "",
        b?.billNumber ?? b?.id ?? "", b?.service ?? "",
        p.mode ?? "other", p.amount, p.note ?? "",
      ]);
      rows.push(["TOTAL", "", "", "", "", "", collected, ""]);
      const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
      downloadBlob(csv, `payments-log-${rangeLabel}.csv`, "text/csv;charset=utf-8");
    }
    setExportOpen(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text(businessName || "Payments Report", 40, 50);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Range: ${bounds.label}`, 40, 68);
    doc.text(`Generated: ${format(new Date(), "PPp")}`, 40, 82);

    // Summary box
    doc.setDrawColor(220); doc.roundedRect(40, 96, w - 80, 70, 6, 6);
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text("COLLECTED", 56, 116); doc.text("PENDING (ALL)", 200, 116);
    doc.text("BILLED (RANGE)", 344, 116); doc.text("PAID / BILLED", 470, 116);
    doc.setFontSize(13); doc.setTextColor(0); doc.setFont("helvetica", "bold");
    doc.text(rs(collected), 56, 138);
    doc.text(rs(totalPending), 200, 138);
    doc.text(rs(rangedBilled), 344, 138);
    doc.text(`${rangedPaidVsBilled}%`, 470, 138);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120);
    const filterDesc: string[] = [];
    if (status !== "all") filterDesc.push(`Status: ${status}`);
    if (minAmt) filterDesc.push(`Min: ${rs(Number(minAmt))}`);
    if (maxAmt) filterDesc.push(`Max: ${rs(Number(maxAmt))}`);
    if (q.trim()) filterDesc.push(`Search: "${q.trim()}"`);
    doc.text(filterDesc.length ? `Filters — ${filterDesc.join(" · ")}` : "Filters — none", 56, 158);
    doc.setTextColor(0);

    if (tab === "customer") {
      autoTable(doc, {
        startY: 184,
        head: [["Customer", "Phone", "Bookings", "Billed", "Paid", "Due"]],
        body: customerSummary.map((r) => [
          r.c.name + (r.c.kind === "artist" ? "  ★" : ""),
          r.c.phone, String(r.count),
          rs(r.billed), rs(r.paid), rs(r.due),
        ]),
        foot: [["TOTAL", "", "", rs(searchedTotals.billed), rs(searchedTotals.paid), rs(searchedTotals.due)]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [80, 30, 50], textColor: 255 },
        footStyles: { fillColor: [240, 235, 230], textColor: 0, fontStyle: "bold" },
      });
    } else {
      autoTable(doc, {
        startY: 184,
        head: [["Date", "Customer", "Booking", "Mode", "Amount"]],
        body: logList.map(({ p, c, b }) => [
          format(parseISO(p.date), "dd MMM, HH:mm"),
          c?.name ?? "Unknown",
          (b?.billNumber ?? "").split("-").pop() || "—",
          (p.mode ?? "other").toUpperCase(),
          rs(p.amount),
        ]),
        foot: [["", "", "", "TOTAL", rs(collected)]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [80, 30, 50], textColor: 255 },
        footStyles: { fillColor: [240, 235, 230], textColor: 0, fontStyle: "bold" },
      });
    }

    // Mode split footer
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 200;
    if (finalY < 720) {
      doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text("Payment mode split", 40, finalY + 28);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const total = collected || 1;
      (["gpay", "cash", "other"] as const).forEach((m, i) => {
        const pct = Math.round(((modeSplit[m] ?? 0) / total) * 100);
        doc.text(`${m.toUpperCase()}: ${rs(modeSplit[m] ?? 0)} (${pct}%)`, 40 + i * 170, finalY + 44);
      });
    }

    const rangeLabel = bounds.label.replace(/[^a-z0-9]+/gi, "-");
    doc.save(`payments-${tab}-${rangeLabel}.pdf`);
    setExportOpen(false);
  };

  return (
    <AppShell title="Payments">
      {/* Range switcher */}
      <div className="flex items-center justify-between mb-2 bg-card card-shadow rounded-2xl px-2 py-1.5">
        <button
          onClick={() => { setRangeMode("month"); setMonthRef(subMonths(monthRef, 1)); }}
          className="size-9 rounded-full flex items-center justify-center active:bg-secondary"
          disabled={rangeMode === "custom"}
        ><ChevronLeft className={cn("size-5", rangeMode === "custom" && "opacity-30")} /></button>
        <div className="flex items-center gap-1.5 font-display font-semibold text-sm">
          <CalIcon className="size-4 text-primary" />
          {bounds.label}
        </div>
        <button
          onClick={() => { setRangeMode("month"); setMonthRef(addMonths(monthRef, 1)); }}
          className="size-9 rounded-full flex items-center justify-center active:bg-secondary"
          disabled={rangeMode === "custom"}
        ><ChevronRight className={cn("size-5", rangeMode === "custom" && "opacity-30")} /></button>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat tint="success" icon={<Wallet className="size-3.5" />} label="Collected" value={fmtINR(collected)} />
        <Stat tint="danger" icon={<AlertCircle className="size-3.5" />} label="Pending (all)" value={fmtINR(totalPending)} />
        <Stat tint="primary" icon={<TrendingUp className="size-3.5" />} label="Billed (range)" value={fmtINR(rangedBilled)} />
        <Stat tint="muted" icon={<IndianRupee className="size-3.5" />} label="Paid / Billed" value={`${rangedPaidVsBilled}%`} />
      </div>

      {/* Tabs */}
      <div className="bg-secondary rounded-full p-0.5 flex mb-2">
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

      {/* Search + filter + export */}
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
        <div className="relative">
          <button
            onClick={() => setExportOpen((v) => !v)}
            className="shrink-0 size-11 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground active:bg-secondary"
            aria-label="Export"
          ><Download className="size-4" /></button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 top-12 z-40 bg-card card-shadow rounded-2xl p-1.5 min-w-[160px] border border-border">
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

      {showFilters && (
        <div className="bg-card card-shadow rounded-2xl p-3 mb-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Filters</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-[11px] text-primary font-semibold flex items-center gap-1">
                <XIcon className="size-3" /> Clear
              </button>
            )}
          </div>

          {/* Range mode */}
          <div className="flex gap-1.5">
            {(["month", "custom"] as RangeMode[]).map((m) => (
              <button key={m} onClick={() => setRangeMode(m)}
                className={cn("px-3 py-1.5 rounded-full text-[11px] font-medium", rangeMode === m ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground")}>
                {m === "month" ? "By month" : "Custom range"}
              </button>
            ))}
          </div>
          {rangeMode === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-secondary rounded-xl px-3 py-2 text-sm" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-secondary rounded-xl px-3 py-2 text-sm" />
            </div>
          )}

          {/* Status */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Status</p>
            <div className="flex gap-1.5">
              {(["all", "paid", "due"] as StatusFilter[]).map((s) => (
                <button key={s} onClick={() => setStatus(s)}
                  className={cn("flex-1 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase", status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Amount (₹)</p>
            <div className="grid grid-cols-2 gap-2">
              <input inputMode="numeric" placeholder="Min" value={minAmt} onChange={(e) => setMinAmt(e.target.value.replace(/[^0-9]/g, ""))} className="bg-secondary rounded-xl px-3 py-2 text-sm" />
              <input inputMode="numeric" placeholder="Max" value={maxAmt} onChange={(e) => setMaxAmt(e.target.value.replace(/[^0-9]/g, ""))} className="bg-secondary rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
      )}

      {tab === "log" && (
        <div className="space-y-2">
          {logList.length === 0 ? (
            <div className="bg-card card-shadow rounded-2xl p-8 text-center text-sm text-muted-foreground">
              No payments match.
            </div>
          ) : (
            <>
              <div className="text-[11px] text-muted-foreground px-1 flex justify-between">
                <span>{logList.length} payment{logList.length > 1 ? "s" : ""}</span>
                <span className="font-semibold tabular-nums">{fmtINR(collected)}</span>
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
          {/* Paid vs Pending bar */}
          <div className="bg-card card-shadow rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Paid vs Pending (range)</p>
              <p className="text-[11px] font-bold tabular-nums">{rangedPaidVsBilled}%</p>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-secondary flex">
              <div className="bg-success h-full" style={{ width: `${rangedPaidVsBilled}%` }} />
              <div className="bg-destructive/60 h-full" style={{ width: `${100 - rangedPaidVsBilled}%` }} />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
              <span>Paid <span className="font-bold text-success tabular-nums">{fmtINR(collected)}</span></span>
              <span>Unpaid <span className="font-bold text-destructive tabular-nums">{fmtINR(Math.max(0, rangedBilled - collected))}</span></span>
            </div>
          </div>

          <div className="bg-card card-shadow rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Daily collection</p>
              <p className="text-[11px] font-bold tabular-nums">{fmtINR(collected)}</p>
            </div>
            <div className="h-36">
              {dailyChart.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No data</div>
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
                const pct = collected > 0 ? Math.round((modeSplit[m] / collected) * 100) : 0;
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
              {(() => {
                const months = Array.from({ length: 6 }).map((_, i) => {
                  const ref = subMonths(new Date(), i);
                  const s = startOfMonth(ref), e = endOfMonth(ref);
                  const sum = payments.filter((p) => isWithinInterval(parseISO(p.date), { start: s, end: e })).reduce((a, p) => a + p.amount, 0);
                  return { ref, sum };
                });
                const max = Math.max(1, ...months.map((m) => m.sum));
                return months.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-muted-foreground">{format(m.ref, "MMM")}</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(m.sum / max) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right font-semibold tabular-nums">{fmtINR(m.sum)}</span>
                  </li>
                ));
              })()}
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
