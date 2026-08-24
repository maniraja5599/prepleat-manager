import React, { useState, useEffect } from "react";
import { Lightbulb, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TipChip {
  tag: string;
  desc: string;
  emoji?: string;
}

interface MicroTipBannerProps {
  id: string;
  tip?: string;
  chips?: TipChip[];
  tamilTip?: string;
  badge?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function MicroTipBanner({
  id,
  tip,
  chips,
  tamilTip,
  badge = "QUICK TIP 💡",
  actionLabel,
  onAction,
  className,
}: MicroTipBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = localStorage.getItem(`eyas_tip_dismissed_${id}`) === "true";
      setDismissed(isDismissed);
    }
  }, [id]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(`eyas_tip_dismissed_${id}`, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "relative p-2.5 rounded-2xl bg-amber-500/[0.07] dark:bg-amber-500/[0.10] border border-amber-500/25 shadow-2xs transition-all duration-300 animate-in fade-in slide-in-from-top-1 my-2 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-start gap-2 pr-7">
        <div className="size-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
          <Lightbulb className="size-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
              {badge}
            </span>
            {tamilTip && (
              <span className="text-[10px] font-bold text-foreground truncate">
                {tamilTip}
              </span>
            )}
          </div>

          {/* If Visual Chips are provided */}
          {chips && chips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 items-center">
              {chips.map((c, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1 bg-background/80 dark:bg-background/50 px-2 py-1 rounded-lg border border-border/40 text-[11px] shadow-2xs"
                >
                  {c.emoji && <span className="text-xs">{c.emoji}</span>}
                  <span className="font-extrabold text-foreground font-mono text-[10px] bg-secondary/80 px-1 py-0.2 rounded">
                    {c.tag}
                  </span>
                  <span className="text-muted-foreground font-medium text-[10.5px]">
                    {c.desc}
                  </span>
                </div>
              ))}
            </div>
          ) : tip ? (
            <p className="text-[11px] text-muted-foreground font-medium leading-normal">
              {tip}
            </p>
          ) : null}

          {actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="mt-1.5 text-[10px] font-bold text-primary hover:underline inline-flex items-center gap-0.5 cursor-pointer"
            >
              <span>{actionLabel}</span>
              <ChevronRight className="size-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={handleDismiss}
        title="Dismiss tip"
        className="absolute top-2 right-2 size-5 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition active:scale-95"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
