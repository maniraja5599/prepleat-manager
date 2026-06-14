import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Calendar, ListChecks, Wallet, Users, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";

type Tab = { to: string; label: string; icon: typeof Calendar; primary?: boolean };
const tabs: Tab[] = [
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/settings", label: "Settings", icon: SettingsIcon, primary: true },
  { to: "/bookings", label: "Bookings", icon: ListChecks },
  { to: "/", label: "Calendar", icon: Calendar },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const lastTapRef = useRef<number>(0);

  const handleTouchStart = (to: string) => {
    if (to !== "/") return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      navigate({ to: "/bookings" });
    }
    lastTapRef.current = now;
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border safe-pb">
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {tabs.map((t) => {
          const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
          const Icon = t.icon;
          if (t.primary) {
            return (
              <li key={t.to} className="flex justify-center -mt-5">
                <Link
                  to={t.to}
                  className={cn(
                    "size-14 rounded-full saree-gradient text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition",
                    active && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
                  )}
                >
                  <Icon className="size-7" strokeWidth={2.5} />
                </Link>
              </li>
            );
          }
          return (
            <li key={t.to} className="flex justify-center">
              <Link
                to={t.to}
                onDoubleClick={(e) => {
                  if (t.to === "/") {
                    e.preventDefault();
                    navigate({ to: "/bookings" });
                  }
                }}
                onTouchStart={() => handleTouchStart(t.to)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 py-2 px-3 my-1 rounded-2xl text-[10px] font-semibold transition",
                  active ? "text-primary bg-primary/10" : "text-muted-foreground active:bg-secondary",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                <span className={cn("transition-all", active ? "opacity-100" : "opacity-70")}>{t.label}</span>
                {active && <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-primary" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
