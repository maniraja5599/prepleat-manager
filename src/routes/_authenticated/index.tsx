import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { GrowthDashboard } from "@/components/GrowthDashboard";
import { useStore, totalDue, netBookingAmount, formatShortBillNumber, fmtINR, fmtTime12, formatAppDate } from "@/lib/store";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isAfter,
  addDays,
  subDays,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Plus,
  X,
  Phone,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { cn, cleanPhoneForDialing, cleanPhoneForWhatsApp } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/")({
  validateSearch: (s: Record<string, unknown>): { guide?: string } => ({
    guide: typeof s.guide === "string" ? s.guide : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Calendar — Eyas Saree Drapist" },
      { name: "description", content: "Booking calendar for your PrePleat & Drape work." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const navigate = useNavigate();
  const { guide } = Route.useSearch();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const [peek, setPeek] = useState<string | null>(null);
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const settings = useStore((s) => s.settings);
  const calendarAmountDisplay = settings.calendarAmountDisplay ?? "pending";

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
  const dayBookings = (byDay.get(selectedKey) ?? [])
    .slice()
    .sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime));

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = addDays(today, 60);
    return bookings
      .filter((b) => {
        const d = parseISO(b.deliveryDate);
        return (
          (isSameDay(d, today) || isAfter(d, today)) && d <= horizon && b.status !== "delivered"
        );
      })
      .sort(
        (a, b) =>
          a.deliveryDate.localeCompare(b.deliveryDate) ||
          a.deliveryTime.localeCompare(b.deliveryTime),
      );
  }, [bookings]);



  const [upFilter, setUpFilter] = useState<"all" | "prepleat" | "drape" | "artist">("all");

  const filteredUpcoming = useMemo(() => {
    return upcoming.filter((b) => {
      const c = customers.find((x) => x.id === b.customerId);
      const isArtistBooking = !!b.artistId || c?.kind === "artist";

      if (upFilter === "all") return true;
      if (upFilter === "prepleat") return b.service === "prepleat";
      if (upFilter === "drape") return b.service === "drape" && !isArtistBooking;
      if (upFilter === "artist") return isArtistBooking;
      return true;
    });
  }, [upcoming, upFilter, customers]);

  const monthEvents = useMemo(() => {
    const s = startOfMonth(cursor);
    const e = endOfMonth(cursor);
    return bookings
      .filter((b) => {
        const d = parseISO(b.deliveryDate);
        return d >= s && d <= e;
      })
      .sort(
        (a, b) =>
          a.deliveryDate.localeCompare(b.deliveryDate) ||
          a.deliveryTime.localeCompare(b.deliveryTime),
      );
  }, [bookings, cursor]);

  const threeMonthForecast = useMemo(() => {
    const today = new Date();
    const m0 = startOfMonth(today);
    const m1 = startOfMonth(addMonths(today, 1));
    const m2 = startOfMonth(addMonths(today, 2));

    const countFor = (startM: Date) => {
      const endM = endOfMonth(startM);
      return bookings.filter((b) => {
        if (b.status === "cancelled") return false;
        const d = parseISO(b.deliveryDate);
        return d >= startM && d <= endM;
      }).length;
    };

    return [
      { date: m0, label: format(m0, "MMM"), count: countFor(m0) },
      { date: m1, label: format(m1, "MMM"), count: countFor(m1) },
      { date: m2, label: format(m2, "MMM"), count: countFor(m2) },
    ];
  }, [bookings]);

  const calendarRef = useRef<HTMLDivElement>(null);
  const daySwipeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = calendarRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let isHorizontalSwipe = false;
    let hasDecided = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isHorizontalSwipe = false;
      hasDecided = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (!hasDecided) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);
          hasDecided = true;
        }
      }

      if (hasDecided && isHorizontalSwipe) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!hasDecided || !isHorizontalSwipe) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) {
        setCursor((c) => (dx < 0 ? addMonths(c, 1) : subMonths(c, 1)));
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const el = daySwipeRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let isHorizontalSwipe = false;
    let hasDecided = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isHorizontalSwipe = false;
      hasDecided = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (!hasDecided) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);
          hasDecided = true;
        }
      }

      if (hasDecided && isHorizontalSwipe) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!hasDecided || !isHorizontalSwipe) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) {
        setSelected((d) => (dx < 0 ? addDays(d, 1) : subDays(d, 1)));
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Hold-to-fast-change month
  const monthHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monthHoldInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopMonthHold = () => {
    if (monthHoldTimer.current) {
      clearTimeout(monthHoldTimer.current);
      monthHoldTimer.current = null;
    }
    if (monthHoldInterval.current) {
      clearInterval(monthHoldInterval.current);
      monthHoldInterval.current = null;
    }
  };
  const startMonthHold = (dir: -1 | 1) => {
    stopMonthHold();
    monthHoldTimer.current = setTimeout(() => {
      monthHoldInterval.current = setInterval(() => {
        setCursor((c) => (dir === -1 ? subMonths(c, 1) : addMonths(c, 1)));
      }, 150);
    }, 350);
  };

  useEffect(() => () => stopMonthHold(), []);

  // Long-press peek
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPress = (key: string) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setPeek(key), 380);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const peekBookings = peek ? (byDay.get(peek) ?? []) : [];

  // Touch / Double-tap detection for mobile & desktop
  const lastTapRef = useRef<{ key: string; time: number }>({ key: "", time: 0 });

  const handleDateTap = (d: Date, key: string) => {
    const now = Date.now();
    if (lastTapRef.current.key === key && now - lastTapRef.current.time < 380) {
      // Double-tap detected!
      navigate({ to: "/new", search: { date: key } });
      lastTapRef.current = { key: "", time: 0 };
      return;
    }
    lastTapRef.current = { key, time: now };
    setSelected(d);
  };

  useEffect(() => {
    const handleReset = () => {
      setCursor(new Date());
      setSelected(new Date());
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("reset-calendar-today", handleReset);
    return () => window.removeEventListener("reset-calendar-today", handleReset);
  }, []);

  return (
    <AppShell showBrand showFloatingSearch={true} title="Calendar" subtitle={format(cursor, "MMMM yyyy")}>
      <div className="no-select">

        {/* Clean Calendar Quick Action Strip */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-secondary/50 border border-border/25 my-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground font-bold">👆 1-Tap:</span>
            <span>View Deliveries</span>
          </div>
          <div className="w-px h-3.5 bg-border/60" />
          <div className="flex items-center gap-1.5">
            <span className="text-foreground font-bold">✌️ 2-Tap:</span>
            <span className="text-primary font-bold">New Booking</span>
          </div>
        </div>




        {guide === "book" && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-2xl text-xs text-primary font-medium flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
            <span className="text-base select-none shrink-0">👉</span>
            <div className="flex-1">
              <p className="font-semibold mb-0.5">Select a Date to Book</p>
              <p className="text-muted-foreground font-normal text-[11px] leading-normal">
                Double-tap any date on the calendar, or tap a date once and click the{" "}
                <strong className="text-primary font-bold">+ Book</strong> button below to start a
                booking.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/", search: { guide: undefined } })}
              className="text-muted-foreground hover:text-foreground text-sm font-bold px-1.5 py-0.5 cursor-pointer"
              aria-label="Dismiss guide"
            >
              ×
            </button>
          </div>
        )}

        <>
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCursor(subMonths(cursor, 1))}
                onPointerDown={() => startMonthHold(-1)}
                onPointerUp={stopMonthHold}
                onPointerLeave={stopMonthHold}
                onPointerCancel={stopMonthHold}
                className="size-8 rounded-full hover:bg-secondary flex items-center justify-center no-select touch-none cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4.5" />
              </button>
              <div className="min-w-[70px]">
                <p className="text-sm font-display font-bold leading-tight truncate">
                  {format(cursor, "MMM yyyy")}
                </p>
              </div>
              <button
                onClick={() => setCursor(addMonths(cursor, 1))}
                onPointerDown={() => startMonthHold(1)}
                onPointerUp={stopMonthHold}
                onPointerLeave={stopMonthHold}
                onPointerCancel={stopMonthHold}
                className="size-8 rounded-full hover:bg-secondary flex items-center justify-center no-select touch-none cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="size-4.5" />
              </button>
            </div>

            {/* Smart 3-Month Booking Forecast Chips */}
            <div className="flex items-center gap-1 bg-secondary/60 p-0.5 rounded-2xl border border-border/30">
              {threeMonthForecast.map((m, idx) => {
                const isCurrentView = isSameMonth(cursor, m.date);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCursor(m.date);
                      setSelected(m.date);
                    }}
                    className={cn(
                      "px-2 py-1 rounded-xl text-center transition cursor-pointer flex items-center gap-1 active:scale-95",
                      isCurrentView
                        ? "bg-card text-primary font-bold shadow-2xs border border-primary/25"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    title={`Jump to ${m.label}`}
                  >
                    <span className="text-[10px] uppercase font-semibold">{m.label}</span>
                    <span
                      className={cn(
                        "text-[9px] font-extrabold px-1.5 py-0.2 rounded-full tabular-nums",
                        m.count > 0
                          ? isCurrentView
                            ? "bg-primary text-white"
                            : "bg-secondary text-foreground"
                          : "text-muted-foreground/60",
                      )}
                    >
                      {m.count}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => {
                  setCursor(new Date());
                  setSelected(new Date());
                }}
                className="text-[9.5px] font-bold px-2 py-1 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
                title="Jump to Today"
              >
                Today
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div
            ref={calendarRef}
            className="grid grid-cols-7 gap-1 bg-card rounded-2xl p-2 card-shadow no-select touch-pan-y"
          >
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const list = byDay.get(key) ?? [];
              const isSel = isSameDay(d, selected);
              const isCur = isSameMonth(d, cursor);
              const isToday = isSameDay(d, new Date());
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              const hasPending = list.some((b) => b.status === "completed" && totalDue(b) > 0);
              const dueSum = list.reduce((s, b) => s + (b.status === "completed" ? totalDue(b) : 0), 0);
              const totalSum = list.reduce((s, b) => s + b.totalAmount, 0);
              return (
                <button
                  key={key}
                  onClick={() => handleDateTap(d, key)}
                  onDoubleClick={() => navigate({ to: "/new", search: { date: key } })}
                  onTouchStart={() => startPress(key)}
                  onTouchEnd={cancelPress}
                  onTouchMove={cancelPress}
                  onMouseDown={() => startPress(key)}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setPeek(key);
                  }}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 relative text-sm transition no-select",
                    !isCur && "text-muted-foreground/40",
                    isSel
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-secondary",
                    isToday && !isSel && "ring-1 ring-primary/40",
                  )}
                >
                  <span
                    className={cn("tabular-nums", isToday && !isSel && "text-primary font-bold")}
                  >
                    {format(d, "d")}
                  </span>
                  {list.length > 0 && (
                    <div className="flex gap-0.5">
                      {list.slice(0, 3).map((b) => {
                        const c = customers.find((x) => x.id === b.customerId);
                        const isArtist = !!b.artistId || c?.kind === "artist";
                        const dotColor = isArtist
                          ? (settings.artistDotColor ?? "#84cc16")
                          : b.service === "prepleat"
                            ? (settings.prepleatDotColor ?? "#06b6d4")
                            : (settings.directDrapeDotColor ?? "#d946ef");
                        return (
                          <span
                            key={b.id}
                            className={cn(
                              "size-1.5 rounded-full",
                              isSel && "bg-primary-foreground",
                            )}
                            style={!isSel ? { backgroundColor: dotColor } : undefined}
                          />
                        );
                      })}
                    </div>
                  )}
                  {/* Pending due — always visible for completed bookings with outstanding balance */}
                  {dueSum > 0 && (
                    <span
                      className={cn(
                        "absolute top-0.5 right-1 text-[8px] font-bold leading-none",
                        isSel ? "text-primary-foreground" : "text-destructive",
                      )}
                    >
                      ₹{dueSum > 999 ? Math.round(dueSum / 1000) + "k" : Math.round(dueSum)}
                    </span>
                  )}
                  {/* Total amount — shown in "total" and "both" modes */}
                  {calendarAmountDisplay !== "none" && totalSum > 0 &&
                    (calendarAmountDisplay === "total" || calendarAmountDisplay === "both") && (
                      <span
                        className={cn(
                          "absolute top-0.5 left-1 text-[8px] font-bold leading-none",
                          isSel ? "text-primary-foreground" : "text-muted-foreground/80",
                        )}
                      >
                        ₹{totalSum > 999 ? Math.round(totalSum / 1000) + "k" : totalSum}
                      </span>
                    )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Long-press peek · double-tap to book · swipe ← → or hold arrows for months
          </p>

          {isSameMonth(selected, cursor) && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2 gap-2">
                <button
                  onClick={() => setSelected((d) => subDays(d, 1))}
                  className="size-8 rounded-full bg-secondary flex items-center justify-center shrink-0"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground truncate flex-1 text-center">
                  {format(selected, "EEEE")} · {formatAppDate(selected)}
                </h2>
                <button
                  onClick={() => setSelected((d) => addDays(d, 1))}
                  className="size-8 rounded-full bg-secondary flex items-center justify-center shrink-0"
                  aria-label="Next day"
                >
                  <ChevronRight className="size-4" />
                </button>
                <Link
                  to="/new"
                  search={{ date: format(selected, "yyyy-MM-dd") }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full saree-gradient text-primary-foreground text-xs font-semibold shrink-0"
                >
                  <Plus className="size-3.5" /> Book
                </Link>
              </div>
              <div ref={daySwipeRef} className="touch-pan-y">
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
          )}

          {monthEvents.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground truncate">
                  {format(cursor, "MMMM")} · {monthEvents.length} event
                  {monthEvents.length > 1 ? "s" : ""}
                </h2>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {fmtINR(monthEvents.reduce((s, b) => s + netBookingAmount(b), 0))}
                </span>
              </div>
              <ul className="space-y-2">
                {monthEvents.map((b) => (
                  <BookingRow key={b.id} b={b} customers={customers} showDate />
                ))}
              </ul>
            </div>
          )}
        </>

        {peek && (
          <div
            className="fixed inset-0 z-[20000] bg-black/50 flex items-end sm:items-center justify-center"
            onClick={() => setPeek(null)}
          >
            <div
              className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold">
                  {format(parseISO(peek), "EEEE")} · {formatAppDate(peek)}
                </h3>
                <button
                  onClick={() => setPeek(null)}
                  className="size-8 rounded-full bg-secondary flex items-center justify-center"
                >
                  <X className="size-4" />
                </button>
              </div>
              {peekBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No bookings.</p>
              ) : (
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {peekBookings.map((b) => (
                    <BookingRow key={b.id} b={b} customers={customers} />
                  ))}
                </ul>
              )}
              <Link
                to="/new"
                search={{ date: peek }}
                onClick={() => setPeek(null)}
                className="mt-3 block text-center py-3 rounded-2xl saree-gradient text-primary-foreground text-sm font-semibold"
              >
                + Book this date
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

const BookingRow = memo(function BookingRow({
  b,
  customers,
  showDate,
}: {
  b: ReturnType<typeof useStore.getState>["bookings"][number];
  customers: ReturnType<typeof useStore.getState>["customers"];
  showDate?: boolean;
}) {
  const c = customers.find((x) => x.id === b.customerId);
  const a = b.artistId ? customers.find((x) => x.id === b.artistId) : null;
  const due = totalDue(b);
  const settings = useStore((s) => s.settings);
  const isArtistBooking = !!b.artistId || c?.kind === "artist";
  const tagColor =
    b.service === "prepleat"
      ? (settings.prepleatDotColor ?? "#06b6d4")
      : (settings.directDrapeDotColor ?? "#d946ef");

  return (
    <li className="relative pl-6 pb-4 last:pb-1 group">
      {/* Vertical timeline connector line */}
      <div className="absolute left-[9px] top-4 bottom-0 w-0.5 bg-border/40 group-last:hidden" />

      {/* Timeline Node Dot */}
      <div
        style={{ backgroundColor: tagColor }}
        className="absolute left-0 top-3.5 size-5 rounded-full border-2 border-background shadow-xs flex items-center justify-center text-white"
      >
        <span className="size-1.5 rounded-full bg-white" />
      </div>

      {/* Timeline Card */}
      <Link
        to="/bookings/$id"
        params={{ id: b.id }}
        className={cn(
          "block bg-card card-shadow rounded-2xl p-3.5 active:scale-[0.99] transition relative overflow-hidden text-left w-full border border-border/30 hover:border-primary/40",
          isArtistBooking && "ring-1 ring-gold/30 bg-gradient-to-br from-card to-gold/5",
          b.status === "cancelled" && "opacity-60",
        )}
      >
        {isArtistBooking && (
          <span className="absolute top-0 right-0 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider rounded-bl-xl bg-gold text-white z-10">
            ★ Artist
          </span>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Top row: Client Name & Quick Contact */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="font-bold text-sm text-foreground truncate max-w-[130px] sm:max-w-none">
                {c?.name ?? "Unknown"}
              </span>

              {c?.phone && (
                <span
                  className="inline-flex gap-1 items-center shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href={`tel:${cleanPhoneForDialing(c.phone)}`}
                    className="size-5.5 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition active:scale-90"
                    title="Call Customer"
                  >
                    <Phone className="size-2.5 text-muted-foreground" />
                  </a>
                  <a
                    href={`https://wa.me/${cleanPhoneForWhatsApp(c.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="size-5.5 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition active:scale-90"
                    title="WhatsApp Chat"
                  >
                    <MessageCircle className="size-2.5 text-muted-foreground" />
                  </a>
                </span>
              )}

              <span
                style={{ backgroundColor: tagColor }}
                className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md text-white shrink-0"
              >
                {b.service === "prepleat" ? "PrePleat" : "Drape"}
              </span>

              {(b.billNumber || b.id) && (
                <span className="text-[8px] font-mono font-bold text-muted-foreground bg-secondary/80 px-1.5 py-0.2 rounded-md shrink-0">
                  {formatShortBillNumber(b.billNumber, b.id)}
                </span>
              )}

              {b.status === "delivered" && (
                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground shrink-0">
                  Delivered
                </span>
              )}
            </div>

            {/* Time & Count */}
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground">
                ⏰ {fmtTime12(b.deliveryTime) || "Anytime"}
              </span>
              <span>·</span>
              <span>
                {b.sareeCount} saree{b.sareeCount > 1 ? "s" : ""}
              </span>
              {showDate && (
                <>
                  <span>·</span>
                  <span className="text-primary font-medium">{formatAppDate(b.deliveryDate)}</span>
                </>
              )}
            </div>

            {a && (
              <p className="text-[10px] text-gold font-semibold mt-0.5 truncate">
                via {a.name}
              </p>
            )}
          </div>

          {/* Right Side: Total & Due */}
          <div className="text-right shrink-0 pt-0.5">
            <p className="text-sm font-bold tabular-nums text-foreground">
              {fmtINR(netBookingAmount(b))}
            </p>
            {due > 0 ? (
              <p className="text-[11px] text-destructive font-bold flex items-center justify-end">
                <IndianRupee className="size-2.5" />
                {Math.round(due).toLocaleString("en-IN")} due
              </p>
            ) : (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Paid
              </p>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
});
