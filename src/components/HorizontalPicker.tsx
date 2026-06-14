import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Item {
  key: string;
  primary: string;
  secondary?: string;
}

interface Props {
  items: Item[];
  value: string;
  onChange: (key: string) => void;
  itemWidth?: number;
  label?: string;
  /** Double-tap on the active value — handy for opening a native picker. */
  onDoubleTap?: () => void;
}

/**
 * Horizontal scroll-snap picker. The centred item is the active value.
 * Tap an item or use the ← → buttons to step one-by-one. Fast swipes are
 * supported. Double-tap the picker to trigger {@link Props.onDoubleTap} —
 * works for both mouse and touch (iOS Safari).
 */
export function HorizontalPicker({
  items,
  value,
  onChange,
  itemWidth = 76,
  label,
  onDoubleTap,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const settling = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<number>(0);

  const rawIdx = items.findIndex((i) => i.key === value);
  const inRange = rawIdx >= 0;
  const idx = inRange ? rawIdx : 0;

  useEffect(() => {
    const el = ref.current;
    // If the current value is outside the strip (e.g. user picked a far date
    // from a calendar popover), don't scroll — that would let handleScroll
    // overwrite the value with whatever item ends up centered.
    if (!el || !inRange) return;
    const target = idx * itemWidth;
    const distance = Math.abs(el.scrollLeft - target);
    if (distance <= 1) return;
    settling.current = true;
    // For long jumps (picking a far date from the calendar), smooth scroll
    // can take >1s — during which handleScroll would overwrite the picked
    // value. Use an instant jump for big distances.
    const instant = distance > itemWidth * 6;
    el.scrollTo({ left: target, behavior: instant ? "auto" : "smooth" });
    // Release `settling` only after scrollLeft actually reaches the target.
    let tries = 0;
    const release = () => {
      tries++;
      if (!ref.current) {
        settling.current = false;
        return;
      }
      if (Math.abs(ref.current.scrollLeft - target) <= 1 || tries > 40) {
        settling.current = false;
        return;
      }
      setTimeout(release, 50);
    };
    setTimeout(release, instant ? 30 : 80);
  }, [idx, itemWidth, inRange]);

  const handleScroll = () => {
    if (settling.current) return;
    const el = ref.current;
    if (!el) return;
    if (timer.current) clearTimeout(timer.current);
    const live = () => {
      const i = Math.round(el.scrollLeft / itemWidth);
      const clamped = Math.max(0, Math.min(items.length - 1, i));
      const next = items[clamped];
      if (next && next.key !== value) onChange(next.key);
    };
    live();
    timer.current = setTimeout(live, 40);
  };

  const step = (dir: -1 | 1) => {
    if (!inRange) {
      // Snap back into the strip first so ← / → behave intuitively.
      const fallback = items[0];
      if (fallback) onChange(fallback.key);
      return;
    }
    const next = items[Math.max(0, Math.min(items.length - 1, idx + dir))];
    if (next) onChange(next.key);
  };

  // Press-and-hold on chevrons to fast-scroll continuously.
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
  };
  const startHold = (dir: -1 | 1) => {
    stopHold();
    // After an initial delay, scroll the strip continuously by itemWidth
    // every ~60ms. This drives handleScroll which updates the value, so the
    // user sees the picker race through items while they hold the button.
    holdTimer.current = setTimeout(() => {
      holdInterval.current = setInterval(() => {
        const el = ref.current;
        if (!el) return;
        const delta = dir * itemWidth;
        const max = el.scrollWidth - el.clientWidth;
        const target = Math.max(0, Math.min(max, el.scrollLeft + delta));
        if (target === el.scrollLeft) {
          stopHold();
          return;
        }
        el.scrollTo({ left: target, behavior: "auto" });
      }, 60);
    }, 280);
  };
  useEffect(() => () => stopHold(), []);

  // Unified double-tap detection — works on touch (iOS) and mouse.
  const fireDoubleTap = () => {
    if (!onDoubleTap) return;
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      onDoubleTap();
    } else {
      lastTap.current = now;
    }
  };

  return (
    <div className="select-none">
      {label && (
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 text-center">
          {label}
        </p>
      )}
      <div className="relative">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-primary/10 border border-primary/30 z-0"
          style={{ width: itemWidth - 6, height: 56 }}
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-card to-transparent z-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent z-20" />
        <button
          type="button"
          onClick={() => step(-1)}
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          aria-label="Previous"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 size-7 rounded-full bg-secondary/90 flex items-center justify-center shadow"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          aria-label="Next"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 size-7 rounded-full bg-secondary/90 flex items-center justify-center shadow"
        >
          <ChevronRight className="size-4" />
        </button>

        <div
          ref={ref}
          onScroll={handleScroll}
          className="overflow-x-scroll snap-x snap-mandatory no-scrollbar overscroll-contain h-16 flex items-center"
          style={{
            scrollPaddingInline: `calc(50% - ${itemWidth / 2}px)`,
            paddingInline: `calc(50% - ${itemWidth / 2}px)`,
            touchAction: "pan-x",
          }}
        >
          {items.map((it) => {
            const active = it.key === value;
            return (
              <button
                type="button"
                key={it.key}
                onClick={() => {
                  onChange(it.key);
                  fireDoubleTap();
                }}
                onTouchEnd={() => {
                  /* tap counted via onClick */
                }}
                className={cn(
                  "snap-center shrink-0 h-14 flex flex-col items-center justify-center rounded-xl transition relative z-10 no-select",
                  active ? "text-primary" : "text-muted-foreground/70",
                )}
                style={{ width: itemWidth }}
              >
                <span
                  className={cn(
                    "text-base leading-tight tabular-nums",
                    active && "font-bold text-lg",
                  )}
                >
                  {it.primary}
                </span>
                {it.secondary && (
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wider leading-tight",
                      active && "font-semibold",
                    )}
                  >
                    {it.secondary}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
