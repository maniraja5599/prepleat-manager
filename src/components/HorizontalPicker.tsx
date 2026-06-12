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
export function HorizontalPicker({ items, value, onChange, itemWidth = 76, label, onDoubleTap }: Props) {
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
    if (Math.abs(el.scrollLeft - target) > 1) {
      settling.current = true;
      el.scrollTo({ left: target, behavior: "smooth" });
      setTimeout(() => { settling.current = false; }, 220);
    }
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
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 text-center">{label}</p>
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
          aria-label="Previous"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 size-7 rounded-full bg-secondary/90 flex items-center justify-center shadow"
        ><ChevronLeft className="size-4" /></button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 size-7 rounded-full bg-secondary/90 flex items-center justify-center shadow"
        ><ChevronRight className="size-4" /></button>
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
                onClick={() => { onChange(it.key); fireDoubleTap(); }}
                onTouchEnd={() => { /* tap counted via onClick */ }}
                className={cn(
                  "snap-center shrink-0 h-14 flex flex-col items-center justify-center rounded-xl transition relative z-10",
                  active ? "text-primary" : "text-muted-foreground/70",
                )}
                style={{ width: itemWidth }}
              >
                <span className={cn("text-base leading-tight tabular-nums", active && "font-bold text-lg")}>
                  {it.primary}
                </span>
                {it.secondary && (
                  <span className={cn("text-[10px] uppercase tracking-wider leading-tight", active && "font-semibold")}>
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
