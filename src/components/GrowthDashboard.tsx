import { useMemo } from "react";
import { useStore, fmtINR } from "@/lib/store";
import { parseISO, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { IndianRupee, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";

export function GrowthDashboard() {
  const bookings = useStore((s) => s.bookings);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthBookings = bookings.filter((b) => {
      const d = parseISO(b.deliveryDate);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    });
    const monthRevenue = monthBookings.reduce((s, b) => s + b.totalAmount, 0);
    const pendingDue = bookings.reduce((s, b) => s + Math.max(0, b.totalAmount - b.advancePaid), 0);
    const sarees = monthBookings.reduce((s, b) => s + b.sareeCount, 0);
    const delivered = monthBookings.filter((b) => b.status === "delivered").length;
    const completion = monthBookings.length ? Math.round((delivered / monthBookings.length) * 100) : 0;
    return { monthRevenue, pendingDue, sarees, completion };
  }, [bookings]);

  if (bookings.length === 0) return null;

  return (
    <section className="mb-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<IndianRupee className="size-3.5" />} label="This month" value={fmtINR(stats.monthRevenue)} tint="primary" />
        <Stat icon={<AlertCircle className="size-3.5" />} label="Pending due" value={fmtINR(stats.pendingDue)} tint="destructive" />
        <Stat icon={<Calendar className="size-3.5" />} label="Sarees (mo)" value={String(stats.sarees)} tint="accent" />
        <Stat icon={<CheckCircle2 className="size-3.5" />} label="Completion" value={`${stats.completion}%`} tint="success" />
      </div>
    </section>
  );
}

function Stat({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: "primary" | "destructive" | "accent" | "success" }) {
  const tintCls =
    tint === "primary" ? "text-primary" :
    tint === "destructive" ? "text-destructive" :
    tint === "success" ? "text-success" : "text-foreground";
  return (
    <div className="bg-card card-shadow rounded-2xl p-3">
      <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold ${tintCls}`}>
        {icon}<span>{label}</span>
      </div>
      <p className="text-lg font-display font-semibold mt-1 tabular-nums">{value}</p>
    </div>
  );
}
