import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, totalDue, fmtINR } from "@/lib/store";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek,
  format, isSameMonth, isSameDay, addMonths, subMonths, parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Eye, EyeOff, IndianRupee, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Calendar — Eyas Saree Drapist" },
      { name: "description", content: "Booking calendar for your PrePleat & Drape work." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const { showPaymentOnCalendar } = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, typeof bookings>();
    for (const b of bookings) {
      const key = format(parseISO(b.deliveryDate), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    return map;
  }, [bookings]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const dayBookings = (byDay.get(selectedKey) ?? []).slice().sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime));

  return (
    <AppShell
      showBrand
      title="Calendar"
      subtitle={format(cursor, "MMMM yyyy")}
      right={
        <button
          onClick={() => updateSettings({ showPaymentOnCalendar: !showPaymentOnCalendar })}
          className="size-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground active:scale-95"
          aria-label="Toggle payment view"
        >
          {showPaymentOnCalendar ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
        </button>
      }
    >
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCursor(subMonths(cursor, 1))} className="size-10 rounded-full hover:bg-secondary flex items-center justify-center">
          <ChevronLeft className="size-5" />
        </button>
        <button onClick={() => { setCursor(new Date()); setSelected(new Date()); }} className="text-sm font-medium px-3 py-1.5 rounded-full bg-secondary">Today</button>
        <button onClick={() => setCursor(addMonths(cursor, 1))} className="size-10 rounded-full hover:bg-secondary flex items-center justify-center">
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {["M","T","W","T","F","S","S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1 bg-card rounded-2xl p-2 card-shadow">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const list = byDay.get(key) ?? [];
          const isSel = isSameDay(d, selected);
          const isCur = isSameMonth(d, cursor);
          const isToday = isSameDay(d, new Date());
          const hasPending = list.some((b) => totalDue(b) > 0);
          const dueSum = list.reduce((s, b) => s + totalDue(b), 0);
          return (
            <button
              key={key}
              onClick={() => setSelected(d)}
              className={cn(
                "aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 relative text-sm transition",
                !isCur && "text-muted-foreground/40",
                isSel ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary",
                isToday && !isSel && "ring-1 ring-primary/40",
              )}
            >
              <span className={cn("tabular-nums", isToday && !isSel && "text-primary font-bold")}>{format(d, "d")}</span>
              {list.length > 0 && (
                <div className="flex gap-0.5">
                  {list.slice(0, 3).map((b) => (
                    <span
                      key={b.id}
                      className={cn(
                        "size-1.5 rounded-full",
                        b.service === "prepleat" ? "bg-[oklch(0.78_0.13_75)]" : "bg-[oklch(0.55_0.13_150)]",
                        isSel && "bg-primary-foreground",
                      )}
                    />
                  ))}
                </div>
              )}
              {showPaymentOnCalendar && hasPending && (
                <span className={cn("absolute top-0.5 right-1 text-[8px] font-bold", isSel ? "text-primary-foreground" : "text-destructive")}>
                  ₹{dueSum > 999 ? Math.round(dueSum/1000) + "k" : dueSum}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {format(selected, "EEEE, MMM d")}
          </h2>
          <Link
            to="/new"
            search={{ date: format(selected, "yyyy-MM-dd") }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full saree-gradient text-primary-foreground text-xs font-semibold shrink-0"
          >
            <Plus className="size-3.5" /> Book this date
          </Link>
        </div>
        {dayBookings.length === 0 ? (
          <div className="bg-card card-shadow rounded-2xl p-6 text-center text-sm text-muted-foreground">
            No bookings on this day. Tap “Book this date” to add one.
          </div>
        ) : (
          <ul className="space-y-2">
            {dayBookings.map((b) => {
              const c = customers.find((x) => x.id === b.customerId);
              const due = totalDue(b);
              return (
                <li key={b.id}>
                  <Link
                    to="/bookings/$id"
                    params={{ id: b.id }}
                    className="block bg-card card-shadow rounded-2xl p-4 active:scale-[0.99] transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                            b.service === "prepleat" ? "bg-[oklch(0.92_0.08_75)] text-[oklch(0.4_0.12_60)]" : "bg-[oklch(0.9_0.06_150)] text-[oklch(0.35_0.12_150)]",
                          )}>{b.service}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{b.deliveryTime}</span>
                        </div>
                        <p className="font-semibold mt-1 truncate">{c?.name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{b.sareeCount} saree{b.sareeCount > 1 && "s"} · {fmtINR(b.totalAmount)}</p>
                      </div>
                      {due > 0 ? (
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Due</p>
                          <p className="text-destructive font-bold flex items-center"><IndianRupee className="size-3.5" />{Math.round(due).toLocaleString("en-IN")}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/15 text-success">Paid</span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
