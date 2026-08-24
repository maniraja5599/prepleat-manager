import { useState, useEffect } from "react";
import { X, Sparkles, Check, ChevronDown, ChevronUp, History, ArrowRight } from "lucide-react";
import { APP_VERSION, RECENT_UPDATES, type ChangelogEntry } from "@/lib/changelog";
import { cn } from "@/lib/utils";

export function WhatsNewModal() {
  const [open, setOpen] = useState(false);
  const [showOlder, setShowOlder] = useState(false);
  const latestEntry = RECENT_UPDATES[0];

  useEffect(() => {
    // Strictly show ONLY ONCE when a new version update arrives
    try {
      const lastSeenVersion = localStorage.getItem("eyas_last_seen_version");
      if (lastSeenVersion !== APP_VERSION) {
        const timer = setTimeout(() => {
          setOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Allow manual triggering from Settings or footer
    const handleTrigger = () => {
      setOpen(true);
    };
    window.addEventListener("trigger-whats-new", handleTrigger);
    return () => window.removeEventListener("trigger-whats-new", handleTrigger);
  }, []);

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      localStorage.setItem("eyas_last_seen_version", APP_VERSION);
      localStorage.setItem("eyas_last_seen_version_time", String(Date.now()));
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!open || !latestEntry) return null;

  return (
    <div
      className="fixed inset-0 z-[25000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 text-left animate-in fade-in duration-200"
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border/20 overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-5 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="saree-gradient p-5 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Sparkles className="size-4.5 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
                  {latestEntry.badge || "NEW UPDATE"}
                </span>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="size-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition active:scale-95 cursor-pointer"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <h2 className="text-xl font-display font-bold mt-3">
            What's New in {latestEntry.version}
          </h2>
          <p className="text-xs text-white/85 mt-0.5">
            {latestEntry.title} · {latestEntry.date}
          </p>
        </div>

        {/* Modal Body / Update list */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          <div className="space-y-3">
            {latestEntry.changes.map((change, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-secondary/40 border border-border/10 hover:bg-secondary/60 transition"
              >
                <span className="text-xl shrink-0 select-none mt-0.5">{change.emoji}</span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground leading-snug">
                    {change.text}
                  </h4>
                  {change.desc && (
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {change.desc}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Older Changelogs toggle */}
          {RECENT_UPDATES.length > 1 && (
            <div className="pt-2 border-t border-border/15">
              <button
                type="button"
                onClick={() => setShowOlder(!showOlder)}
                className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground py-2 cursor-pointer transition"
              >
                <span className="flex items-center gap-1.5">
                  <History className="size-3.5" /> Previous Versions ({RECENT_UPDATES.length - 1})
                </span>
                {showOlder ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>

              {showOlder && (
                <div className="space-y-4 mt-2 pt-2">
                  {RECENT_UPDATES.slice(1).map((entry) => (
                    <div
                      key={entry.version}
                      className="p-3.5 rounded-2xl bg-secondary/20 border border-border/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-primary font-mono">
                          {entry.version}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{entry.date}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground mb-2">{entry.title}</p>
                      <div className="space-y-1.5">
                        {entry.changes.map((c, idx) => (
                          <div key={idx} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                            <span>{c.emoji}</span>
                            <span>{c.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Action */}
        <div className="p-4 bg-card border-t border-border/10 shrink-0">
          <button
            type="button"
            onClick={(e) => handleDismiss(e)}
            className="w-full py-3 px-4 rounded-2xl saree-gradient text-white text-sm font-bold shadow-md hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>புரிந்துவிட்டது (Got it!)</span>
            <Check className="size-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
}
