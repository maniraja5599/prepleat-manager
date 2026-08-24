import { useState, useEffect } from "react";
import { Lightbulb, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicroTipBannerProps {
  id: string;
  tip: string;
  tamilTip?: string;
  badge?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function MicroTipBanner({
  id,
  tip,
  tamilTip,
  badge = "PRO-TIP 💡",
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
        "relative p-2.5 sm:p-3 rounded-2xl bg-amber-500/[0.08] dark:bg-amber-500/[0.12] border border-amber-500/25 flex items-start gap-2.5 shadow-2xs transition-all duration-300 animate-in fade-in slide-in-from-top-1 my-2.5",
        className,
      )}
    >
      <div className="size-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/25">
        <Lightbulb className="size-3.5" />
      </div>

      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
            {badge}
          </span>
          {tamilTip && (
            <span className="text-[10.5px] font-bold text-foreground">
              {tamilTip}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {tip}
        </p>

        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="mt-1.5 text-[10.5px] font-bold text-primary hover:underline inline-flex items-center gap-0.5 cursor-pointer"
          >
            <span>{actionLabel}</span>
            <ChevronRight className="size-3" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        title="Dismiss tip"
        className="absolute top-2.5 right-2.5 size-6 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition active:scale-95"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
