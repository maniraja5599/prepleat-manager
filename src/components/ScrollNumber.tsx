import { useEffect, useRef } from "react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

/**
 * Wheel-style number picker. Drag / scroll to change value.
 * Each item = 44px tall.
 */
export function ScrollNumber({ value, onChange, min = 10, max = 80, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const ITEM_H = 44;
  const isScrolling = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncing = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = items.indexOf(value);
    if (idx >= 0) {
      syncing.current = true;
      el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
      setTimeout(() => (syncing.current = false), 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el || syncing.current) return;
    if (isScrolling.current) clearTimeout(isScrolling.current);
    isScrolling.current = setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const next = items[Math.max(0, Math.min(items.length - 1, idx))];
      if (next !== value) onChange(next);
      el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    }, 80);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">{label}</span>}
      <div className="relative w-20 h-[132px]">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-11 rounded-lg bg-primary/8 border-y border-primary/30 pointer-events-none z-10" />
        <div
          ref={ref}
          onScroll={handleScroll}
          className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
          style={{ scrollPaddingBlock: 44 }}
        >
          <div style={{ height: 44 }} />
          {items.map((n) => (
            <div
              key={n}
              className={`h-11 snap-center flex items-center justify-center text-xl tabular-nums transition ${
                n === value ? "text-primary font-bold scale-110" : "text-muted-foreground"
              }`}
            >
              {n}
            </div>
          ))}
          <div style={{ height: 44 }} />
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground">inch</span>
    </div>
  );
}
