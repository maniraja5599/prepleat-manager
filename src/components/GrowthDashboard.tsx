import { useMemo } from "react";
import { useStore, fmtINR } from "@/lib/store";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO, isWithinInterval, subDays, startOfMonth, endOfMonth } from "date-fns";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { TrendingUp, IndianRupee, Calendar, AlertCircle } from "lucide-react";

export function GrowthDashboard() {
  const bookings = useStore((s) => s.bookings);
  const payments = useStore((s) => s.payments);

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

  const weekly = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(subDays(today, 0), { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const revenue = payments
        .filter((p) => p.date.slice(0, 10) === key)
        .reduce((s, p) => s + p.amount, 0);
      return { day: format(d, "EEE")[0], revenue };
    });
  }, [payments]);

  if (bookings.length === 0) return null;

  return (
    <section className="mb-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<IndianRupee className="size-3.5" />} label="This month" value={fmtINR(stats.monthRevenue)} tint="primary" />
        <Stat icon={<AlertCircle className="size-3.5" />} label="Pending due" value={fmtINR(stats.pendingDue)} tint="destructive" />
        <Stat icon={<Calendar className="size-3.5" />} label="Sarees (mo)" value={String(stats.sarees)} tint="accent" />
        <Stat icon={<TrendingUp className="size-3.5" />} label="Completion" value={`${stats.completion}%`} tint="success" />
      </div>
      <div className="bg-card card-shadow rounded-2xl p-3 mt-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">This week revenue</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">{fmtINR(weekly.reduce((s, d) => s + d.revenue, 0))}</p>
        </div>
        <div className="h-20 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
              <Tooltip
                cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [fmtINR(v), "Revenue"]}
              />
              <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
