import { useMemo } from "react";
import { useStore, fmtINR, totalDue } from "@/lib/store";
import { parseISO, isWithinInterval, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { IndianRupee, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";

export function GrowthDashboard() {
  const bookings = useStore((s) => s.bookings);

  const stats = useMemo(() => {
    const now = new Date();
    
    // 1. Current Month Interval & Calcs
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthBookings = bookings.filter((b) => {
      if (b.status === "cancelled") return false;
      const d = parseISO(b.deliveryDate);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    });
    const monthRevenue = monthBookings.reduce((s, b) => s + b.totalAmount, 0);
    const sarees = monthBookings.reduce((s, b) => s + b.sareeCount, 0);
    const delivered = monthBookings.filter((b) => b.status === "delivered").length;
    const completion = monthBookings.length
      ? Math.round((delivered / monthBookings.length) * 100)
      : 0;

    // 2. Previous Month Interval & Calcs
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));
    const prevMonthBookings = bookings.filter((b) => {
      if (b.status === "cancelled") return false;
      const d = parseISO(b.deliveryDate);
      return isWithinInterval(d, { start: prevMonthStart, end: prevMonthEnd });
    });
    const prevMonthRevenue = prevMonthBookings.reduce((s, b) => s + b.totalAmount, 0);
    const prevMonthSarees = prevMonthBookings.reduce((s, b) => s + b.sareeCount, 0);

    // 3. Outstanding Pending Due (Lifetime active bookings)
    const pendingDue = bookings
      .filter((b) => b.status !== "cancelled" && b.status !== "delivered")
      .reduce((s, b) => s + totalDue(b), 0);

    // 4. Trend percentages
    const revenueDiff = monthRevenue - prevMonthRevenue;
    const revenuePercent = prevMonthRevenue > 0
      ? Math.round((revenueDiff / prevMonthRevenue) * 100)
      : 0;

    const sareesDiff = sarees - prevMonthSarees;
    const sareesPercent = prevMonthSarees > 0
      ? Math.round((sareesDiff / prevMonthSarees) * 100)
      : 0;

    return { 
      monthRevenue, 
      prevMonthRevenue, 
      pendingDue, 
      sarees, 
      prevMonthSarees, 
      completion,
      revenuePercent,
      sareesPercent
    };
  }, [bookings]);

  if (bookings.length === 0) return null;

  return (
    <section className="mb-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={<IndianRupee className="size-3.5" />}
          label="This month"
          value={fmtINR(stats.monthRevenue)}
          subtext={`Last month: ${fmtINR(stats.prevMonthRevenue)}`}
          tint="primary"
          trendPercent={stats.revenuePercent}
        />
        <Stat
          icon={<AlertCircle className="size-3.5" />}
          label="Pending due"
          value={fmtINR(stats.pendingDue)}
          subtext="Outstanding balance"
          tint="destructive"
        />
        <Stat
          icon={<Calendar className="size-3.5" />}
          label="Sarees (mo)"
          value={String(stats.sarees)}
          subtext={`Last month: ${stats.prevMonthSarees}`}
          tint="accent"
          trendPercent={stats.sareesPercent}
        />
        <Stat
          icon={<CheckCircle2 className="size-3.5" />}
          label="Completion"
          value={`${stats.completion}%`}
          subtext="Delivered bookings"
          tint="success"
        />
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  subtext,
  tint,
  trendPercent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  tint: "primary" | "destructive" | "accent" | "success";
  trendPercent?: number;
}) {
  const tintCls =
    tint === "primary"
      ? "text-primary"
      : tint === "destructive"
        ? "text-destructive"
        : tint === "success"
          ? "text-success"
          : "text-foreground";

  const isPositive = trendPercent !== undefined && trendPercent > 0;
  const isNegative = trendPercent !== undefined && trendPercent < 0;

  return (
    <div className="bg-card card-shadow rounded-2xl p-3 flex flex-col justify-between min-h-[72px]">
      <div>
        <div
          className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold ${tintCls}`}
        >
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          <p className="text-lg font-display font-semibold leading-tight tabular-nums">{value}</p>
          {isPositive && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-success/5 text-success select-none">
              ↑ {trendPercent}%
            </span>
          )}
          {isNegative && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive/5 text-destructive select-none">
              ↓ {Math.abs(trendPercent)}%
            </span>
          )}
        </div>
      </div>
      {subtext && (
        <p className="text-[9px] text-muted-foreground font-semibold mt-1 leading-none">
          {subtext}
        </p>
      )}
    </div>
  );
}
