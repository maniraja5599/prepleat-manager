import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Calendar, ListChecks, Wallet, Users, ReceiptText, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useState } from "react";

type Tab = { to: string; label: string; icon: typeof Calendar; primary?: boolean };
const tabs: Tab[] = [
  { to: "/payments", label: "Finances", icon: Wallet },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/bills", label: "Bills", icon: ReceiptText, primary: true },
  { to: "/bookings", label: "Bookings", icon: ListChecks },
  { to: "/", label: "Calendar", icon: Calendar },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkKeyboard = () => {
      const isInputFocused = ["INPUT", "TEXTAREA", "SELECT"].includes(
        document.activeElement?.tagName || ""
      );
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        setIsKeyboardOpen(heightDiff > 80 || isInputFocused);
      } else {
        setIsKeyboardOpen(isInputFocused);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        setIsKeyboardOpen(true);
      }
      setTimeout(checkKeyboard, 50);
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const isInputFocused = ["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName || ""
        );
        if (!isInputFocused) {
          setIsKeyboardOpen(false);
        }
      }, 100);
    };

    window.visualViewport?.addEventListener("resize", checkKeyboard);
    window.visualViewport?.addEventListener("scroll", checkKeyboard);
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    return () => {
      window.visualViewport?.removeEventListener("resize", checkKeyboard);
      window.visualViewport?.removeEventListener("scroll", checkKeyboard);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  const isOnBills = pathname === "/bills";
  const isOnSettings = pathname === "/settings";
  const isCenterActive = isOnBills || isOnSettings;
  const centerDestination = isOnBills ? "/settings" : "/bills";
  const CenterIcon = isOnBills || isOnSettings ? SettingsIcon : ReceiptText;
  const centerTitle = isOnBills ? "Open Settings" : isOnSettings ? "Settings Active" : "Bills Register";

  const handleCalendarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      window.dispatchEvent(new Event("open-global-search"));
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        window.dispatchEvent(new Event("close-global-search"));
        if (pathname === "/") {
          window.dispatchEvent(new Event("reset-calendar-today"));
        } else {
          navigate({ to: "/" });
        }
      }, 250);
    }
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-[10000] bg-background/95 backdrop-blur border-t border-border safe-pb transition-all duration-200",
        isKeyboardOpen ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      )}
    >
      <ul className="grid grid-cols-5 max-w-lg md:max-w-2xl mx-auto">
        {tabs.map((t) => {
          const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
          const Icon = t.icon;
          if (t.primary) {
            return (
              <li key="/bills" className="flex justify-center -mt-5">
                <Link
                  to={centerDestination}
                  className={cn(
                    "size-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer",
                    isCenterActive
                      ? "saree-gradient text-white shadow-lg shadow-primary/35 ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                      : "bg-card border-2 border-border/80 text-muted-foreground hover:text-foreground shadow-md hover:border-primary/40",
                  )}
                  title={centerTitle}
                >
                  <CenterIcon className={cn("size-6 transition-transform duration-200", isCenterActive ? "scale-105" : "scale-100")} strokeWidth={2.2} />
                </Link>
              </li>
            );
          }
          return (
            <li key={t.to} className="flex justify-center">
              <Link
                to={t.to}
                onClick={(e) => {
                  if (t.to === "/") {
                    handleCalendarClick(e);
                  }
                }}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 py-2 px-3 my-1 rounded-2xl text-[10px] font-semibold transition",
                  active
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground active:bg-secondary",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                <span className={cn("transition-all", active ? "opacity-100" : "opacity-70")}>
                  {t.label}
                </span>
                {active && (
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-primary" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
