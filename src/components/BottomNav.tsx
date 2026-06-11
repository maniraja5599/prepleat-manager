import { Link, useRouterState } from "@tanstack/react-router";
import { Calendar, ListChecks, Plus, Users, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = { to: string; label: string; icon: typeof Calendar; primary?: boolean };
const tabs: Tab[] = [
  { to: "/", label: "Calendar", icon: Calendar },
  { to: "/bookings", label: "Bookings", icon: ListChecks },
  { to: "/new", label: "New", icon: Plus, primary: true },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
                  className="size-14 rounded-full saree-gradient text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition"
                >
                  <Icon className="size-7" strokeWidth={2.5} />
                </Link>
              </li>
            );
          }
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
