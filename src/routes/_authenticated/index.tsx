import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { GrowthDashboard } from "@/components/GrowthDashboard";
import { useStore, totalDue, fmtINR, fmtTime12 } from "@/lib/store";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek,
  format, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isAfter, addDays, subDays,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Eye, EyeOff, IndianRupee, List, Plus, Users, Wallet, X } from "lucide-react";
import { memo, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Calendar — Eyas Saree Drapist" },
      { name: "description", content: "Booking calendar for your PrePleat & Drape work." },
    ],
  }),
  component: CalendarPage,
});

type View = "calendar" | "upcoming";

function CalendarPage() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const [view, setView] = useState<View>("calendar");
  const [peek, setPeek] = useState<string | null>(null);
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const { showPaymentOnCalendar } = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
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

  const upcoming = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const horizon = addDays(today, 60);
    return bookings
      .filter((b) => {
        const d = parseISO(b.deliveryDate);
        return (isSameDay(d, today) || isAfter(d, today)) && d <= horizon && b.status !== "delivered";
      })
      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || a.deliveryTime.localeCompare(b.deliveryTime));
  }, [bookings]);

  const monthEvents = useMemo(() => {
    const s = startOfMonth(cursor);
    const e = endOfMonth(cursor);
    return bookings
      .filter((b) => {
        const d = parseISO(b.deliveryDate);
        return d >= s && d <= e;
      })
      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || a.deliveryTime.localeCompare(b.deliveryTime));
  }, [bookings, cursor]);

  // Swipe between months
  const touchX = useRef<number | null>(null);
  const dayTouchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 50) return;
    setCursor((c) => (dx < 0 ? addMonths(c, 1) : subMonths(c, 1)));
  };

  // Long-press peek
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPress = (key: string) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setPeek(key), 380);
  };
  const cancelPress = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };

  const peekBookings = peek ? (byDay.get(peek) ?? []) : [];

  return (
    <AppShell
      showBrand
      title="Calendar"
      subtitle={view === "calendar" ? format(cursor, "MMMM yyyy") : "Next 60 days"}
      right={
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setView(view === "calendar" ? "upcoming" : "calendar")}
            className="size-10 rounded-full bg-secondary flex items-center justify-center"
            aria-label="Toggle view"
          >
            {view === "calendar" ? <List className="size-5" /> : <CalendarDays className="size-5" />}
          </button>
          <button
            onClick={() => updateSettings({ showPaymentOnCalendar: !showPaymentOnCalendar })}
            className="size-10 rounded-full bg-secondary flex items-center justify-center"
            aria-label="Toggle payment view"
          >
            {showPaymentOnCalendar ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
          </button>
        </div>
      }
    >
      <GrowthDashboard />
      <div className="grid grid-cols-4 gap-2 mb-4">
        <Link
          to="/new"
          search={{ date: format(selected, "yyyy-MM-dd") }}
          className="bg-card card-shadow rounded-2xl active:scale-[0.97] transition flex flex-col items-center justify-center gap-1 py-3"
        >
          <span className="size-9 rounded-full saree-gradient text-primary-foreground flex items-center justify-center">
            <Plus className="size-4" />
          </span>
          <span className="text-[11px] font-semibold">New</span>
        </Link>
        <button
          onClick={() => { setCursor(new Date()); setSelected(new Date()); setView("calendar"); }}
          className="bg-card card-shadow rounded-2xl active:scale-[0.97] transition flex flex-col items-center justify-center gap-1 py-3"
        >
          <span className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <CalendarDays className="size-4" />
          </span>
          <span className="text-[11px] font-semibold">Today</span>
        </button>
        <Link
          to="/customers"
          className="bg-card card-shadow rounded-2xl active:scale-[0.97] transition flex flex-col items-center justify-center gap-1 py-3"
        >
          <span className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Users className="size-4" />
          </span>
          <span className="text-[11px] font-semibold">Customers</span>
        </Link>
        <Link
          to="/bookings"
          className="bg-card card-shadow rounded-2xl active:scale-[0.97] transition flex flex-col items-center justify-center gap-1 py-3"
        >
          <span className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Wallet className="size-4" />
          </span>
          <span className="text-[11px] font-semibold">Payments</span>
        </Link>
      </div>
      {view === "calendar" ? (
        <>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCursor(subMonths(cursor, 1))} className="size-10 rounded-full hover:bg-secondary flex items-center justify-center" aria-label="Previous month">
              <ChevronLeft className="size-5" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-base font-display font-semibold leading-tight">{format(cursor, "MMMM")}</p>
              <p className="text-[11px] text-muted-foreground tabular-nums leading-tight">{format(cursor, "yyyy")}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setCursor(new Date()); setSelected(new Date()); }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary"
              >Today</button>
              <button onClick={() => setCursor(addMonths(cursor, 1))} className="size-10 rounded-full hover:bg-secondary flex items-center justify-center" aria-label="Next month">
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
          </div>

          <div
            className="grid grid-cols-7 gap-1 bg-card rounded-2xl p-2 card-shadow touch-pan-y no-select"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
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
                  onDoubleClick={() => navigate({ to: "/new", search: { date: key } })}
                  onTouchStart={() => startPress(key)}
                  onTouchEnd={cancelPress}
                  onTouchMove={cancelPress}
                  onMouseDown={() => startPress(key)}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onContextMenu={(e) => { e.preventDefault(); setPeek(key); }}
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
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">Swipe ←/→ change month · long-press peek · double-tap to book</p>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2 gap-2">
              <button
                onClick={() => setSelected((d) => subDays(d, 1))}
                className="size-8 rounded-full bg-secondary flex items-center justify-center shrink-0"
                aria-label="Previous day"
              ><ChevronLeft className="size-4" /></button>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground truncate flex-1 text-center">
                {format(selected, "EEEE, MMM d")}
              </h2>
              <button
                onClick={() => setSelected((d) => addDays(d, 1))}
                className="size-8 rounded-full bg-secondary flex items-center justify-center shrink-0"
                aria-label="Next day"
              ><ChevronRight className="size-4" /></button>
              <Link
                to="/new"
                search={{ date: format(selected, "yyyy-MM-dd") }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full saree-gradient text-primary-foreground text-xs font-semibold shrink-0"
              >
                <Plus className="size-3.5" /> Book
              </Link>
            </div>
            <div
              className="touch-pan-y"
              onTouchStart={(e) => { dayTouchX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (dayTouchX.current == null) return;
                const dx = e.changedTouches[0].clientX - dayTouchX.current;
                dayTouchX.current = null;
                if (Math.abs(dx) < 50) return;
                setSelected((d) => (dx < 0 ? addDays(d, 1) : subDays(d, 1)));
              }}
            >
            {dayBookings.length === 0 ? (
              <div className="bg-card card-shadow rounded-2xl p-6 text-center text-sm text-muted-foreground">
                No bookings on this day. Swipe ←/→ to change day.
              </div>
            ) : (
              <ul className="space-y-2">
                {dayBookings.map((b) => (
                  <BookingRow key={b.id} b={b} customers={customers} />
                ))}
              </ul>
            )}
            </div>
          </div>

          {monthEvents.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground truncate">
                  {format(cursor, "MMMM")} · {monthEvents.length} event{monthEvents.length > 1 ? "s" : ""}
                </h2>
                <span className="text-[11px] text-muted-foreground tabular-nums">{fmtINR(monthEvents.reduce((s, b) => s + b.totalAmount, 0))}</span>
              </div>
              <ul className="space-y-2">
                {monthEvents.map((b) => (
                  <BookingRow key={b.id} b={b} customers={customers} showDate />
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div>
          {upcoming.length === 0 ? (
            <div className="bg-card card-shadow rounded-2xl p-8 text-center text-sm text-muted-foreground">
              No upcoming bookings in the next 60 days.
            </div>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((b) => (
                <BookingRow key={b.id} b={b} customers={customers} showDate />
              ))}
            </ul>
          )}
        </div>
      )}

      {peek && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setPeek(null)}>
          <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold">{format(parseISO(peek), "EEEE, MMM d")}</h3>
              <button onClick={() => setPeek(null)} className="size-8 rounded-full bg-secondary flex items-center justify-center"><X className="size-4" /></button>
            </div>
            {peekBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No bookings.</p>
            ) : (
              <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                {peekBookings.map((b) => <BookingRow key={b.id} b={b} customers={customers} />)}
              </ul>
            )}
            <Link
              to="/new"
              search={{ date: peek }}
              onClick={() => setPeek(null)}
              className="mt-3 block text-center py-3 rounded-2xl saree-gradient text-primary-foreground text-sm font-semibold"
            >+ Book this date</Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}

const BookingRow = memo(function BookingRow({ b, customers, showDate }: { b: ReturnType<typeof useStore.getState>["bookings"][number]; customers: ReturnType<typeof useStore.getState>["customers"]; showDate?: boolean }) {
  const c = customers.find((x) => x.id === b.customerId);
  const due = totalDue(b);
  return (
    <li>
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
              <span className="text-xs text-muted-foreground tabular-nums">{fmtTime12(b.deliveryTime)}</span>
              {showDate && <span className="text-xs text-muted-foreground">· {format(parseISO(b.deliveryDate), "MMM d")}</span>}
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
});
