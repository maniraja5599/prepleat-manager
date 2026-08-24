import React, { useState, useEffect } from "react";
import { Clock, Sun, Moon, ChevronDown, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimePicker12Props {
  value: string; // 24-hr format "HH:mm" e.g. "17:30"
  onChange: (hhmm: string) => void;
  className?: string;
  label?: string;
}

export function parseTo12Hour(hhmm: string): { hour12: number; minute: number; ampm: "AM" | "PM" } {
  if (!hhmm) return { hour12: 10, minute: 0, ampm: "AM" };
  const parts = hhmm.split(":");
  const h24 = parseInt(parts[0] || "10", 10);
  const m = parseInt(parts[1] || "0", 10);
  const ampm: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour12 = ((h24 + 11) % 12) + 1;
  return { hour12: isNaN(hour12) ? 10 : hour12, minute: isNaN(m) ? 0 : m, ampm };
}

export function formatTo24Hour(hour12: number, minute: number, ampm: "AM" | "PM"): string {
  let h24 = hour12 % 12;
  if (ampm === "PM") h24 += 12;
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function format12Display(hour12: number, minute: number, ampm: "AM" | "PM"): string {
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`;
}

const COMMON_PRESETS = [
  { label: "09:00 AM", h: 9, m: 0, a: "AM" as const },
  { label: "10:30 AM", h: 10, m: 30, a: "AM" as const },
  { label: "12:00 PM", h: 12, m: 0, a: "PM" as const },
  { label: "03:00 PM", h: 3, m: 0, a: "PM" as const },
  { label: "05:00 PM", h: 5, m: 0, a: "PM" as const },
  { label: "06:30 PM", h: 6, m: 30, a: "PM" as const },
  { label: "08:00 PM", h: 8, m: 0, a: "PM" as const },
];

export function TimePicker12({ value, onChange, className, label }: TimePicker12Props) {
  const [isOpen, setIsOpen] = useState(false);
  const parsed = parseTo12Hour(value);
  const [hour, setHour] = useState(parsed.hour12);
  const [minute, setMinute] = useState(parsed.minute);
  const [ampm, setAmpm] = useState<"AM" | "PM">(parsed.ampm);

  useEffect(() => {
    const p = parseTo12Hour(value);
    setHour(p.hour12);
    setMinute(p.minute);
    setAmpm(p.ampm);
  }, [value]);

  const updateTime = (newH: number, newM: number, newA: "AM" | "PM") => {
    setHour(newH);
    setMinute(newM);
    setAmpm(newA);
    const val24 = formatTo24Hour(newH, newM, newA);
    onChange(val24);
  };

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
            {label}
          </span>
          <span className="text-[9px] font-semibold text-primary lowercase bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
            12-hr
          </span>
        </div>
      )}

      {/* Main Trigger Button - Compact & Overflow Free */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full min-w-0 flex items-center justify-between bg-secondary/80 hover:bg-secondary rounded-xl px-2.5 py-2 text-xs font-semibold border transition cursor-pointer text-left overflow-hidden gap-1.5",
          isOpen ? "border-primary ring-2 ring-primary/20 bg-secondary" : "border-border/40 hover:border-border",
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <Clock className="size-3.5 text-primary shrink-0" />
          <span className="text-xs font-bold text-foreground font-mono truncate">
            {format12Display(hour, minute, ampm)}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase",
              ampm === "AM"
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
            )}
          >
            {ampm}
          </span>
          <ChevronDown
            className={cn("size-3 text-muted-foreground transition-transform duration-200 shrink-0", isOpen && "rotate-180")}
          />
        </div>
      </button>

      {/* Expandable 12-Hour Time Picker Panel */}
      {isOpen && (
        <div className="mt-2 bg-card border border-border rounded-2xl p-3 shadow-xl space-y-2.5 z-30 animate-in fade-in zoom-in-95 duration-150 max-w-full">
          {/* Header Card: Big Time Display & AM/PM Switcher */}
          <div className="bg-secondary/60 rounded-xl p-2.5 flex items-center justify-between border border-border/30 gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <Clock className="size-4 text-primary shrink-0" />
              <span className="text-base font-extrabold font-mono text-foreground tracking-wide">
                {String(hour).padStart(2, "0")} : {String(minute).padStart(2, "0")}
              </span>
            </div>

            {/* AM / PM Segmented Control */}
            <div className="flex bg-background p-0.5 rounded-lg border border-border/60 shrink-0">
              <button
                type="button"
                onClick={() => updateTime(hour, minute, "AM")}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-extrabold transition cursor-pointer flex items-center gap-1",
                  ampm === "AM"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Sun className="size-2.5" /> AM
              </button>
              <button
                type="button"
                onClick={() => updateTime(hour, minute, "PM")}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-extrabold transition cursor-pointer flex items-center gap-1",
                  ampm === "PM"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Moon className="size-2.5" /> PM
              </button>
            </div>
          </div>

          {/* Quick 1-Tap Hour Grid (1 to 12) */}
          <div>
            <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
              Select Hour (1 - 12)
            </p>
            <div className="grid grid-cols-6 gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => updateTime(h, minute, ampm)}
                  className={cn(
                    "py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border text-center font-mono",
                    hour === h
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-secondary/70 hover:bg-secondary text-foreground border-transparent",
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Minute Grid (:00, :15, :30, :45) */}
          <div>
            <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
              Select Minutes
            </p>
            <div className="grid grid-cols-4 gap-1">
              {[0, 15, 30, 45].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateTime(hour, m, ampm)}
                  className={cn(
                    "py-1 rounded-lg text-xs font-bold transition cursor-pointer border text-center font-mono",
                    minute === m
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-secondary/70 hover:bg-secondary text-foreground border-transparent",
                  )}
                >
                  :{String(m).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>

          {/* Popular Saree Delivery Presets */}
          <div>
            <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Sparkles className="size-2.5 text-primary" /> Delivery Presets
            </p>
            <div className="flex flex-wrap gap-1">
              {COMMON_PRESETS.map((preset) => {
                const isSelected = hour === preset.h && minute === preset.m && ampm === preset.a;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => updateTime(preset.h, preset.m, preset.a)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer border",
                      isSelected
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "bg-secondary/50 text-muted-foreground border-border/30 hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Done Button */}
          <div className="pt-0.5 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1 rounded-lg saree-gradient text-primary-foreground text-xs font-bold cursor-pointer active:scale-95 transition shadow-xs flex items-center gap-1"
            >
              <Check className="size-3" /> Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
