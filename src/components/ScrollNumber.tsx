import { useEffect, useRef } from "react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

/**
 * Smooth wheel-style number picker.
 * Each item is 40px tall; uses native scroll snap and only commits the value
 * after the user stops scrolling, which avoids the previous "shake" bug.
 */
export function ScrollNumber({ value, onChange, min = 20, max = 80, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const ITEM_H = 40;
  const settling = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Programmatic sync (when value changes from outside)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = Math.max(0, items.indexOf(value));
    const target = idx * ITEM_H;
    if (Math.abs(el.scrollTop - target) > 1) {
      settling.current = true;
      el.scrollTo({ top: target, behavior: "auto" });
      requestAnimationFrame(() => { settling.current = false; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleScroll = () => {
    if (settling.current) return;
    const el = ref.current;
    if (!el) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      const next = items[clamped];
      if (next !== value) onChange(next);
    }, 120);
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {label && (
        <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          {label}
        </span>
      )}
      <div className="relative w-16 h-[120px]">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 rounded-lg bg-primary/10 border-y border-primary/30 z-10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[40px] bg-gradient-to-b from-card to-transparent z-20" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40px] bg-gradient-to-t from-card to-transparent z-20" />
        <div
          ref={ref}
          onScroll={handleScroll}
          className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar overscroll-contain"
          style={{ scrollPaddingBlock: 40, touchAction: "pan-y" }}
        >
          <div style={{ height: 40 }} />
          {items.map((n) => (
            <div
              key={n}
              className={`h-10 snap-center flex items-center justify-center text-lg tabular-nums transition-colors ${
                n === value ? "text-primary font-bold" : "text-muted-foreground/70"
              }`}
            >
              {n}
            </div>
          ))}
          <div style={{ height: 40 }} />
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground">inch</span>
    </div>
  );
}