import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Global tracking for the last clicked button/input
let lastClickedButton: HTMLElement | null = null;

if (typeof window !== "undefined") {
  // Listen to all clicks to capture the last button clicked
  window.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button, input[type='submit']");
    if (btn) {
      lastClickedButton = btn as HTMLElement;
    }
  }, true);

  // Monkey-patch toast.error
  const originalError = toast.error;
  toast.error = function (message: any, data: any) {
    if (lastClickedButton) {
      const btn = lastClickedButton;
      btn.classList.add("button-error-flash");
      setTimeout(() => {
        btn.classList.remove("button-error-flash");
      }, 600);
    }
    return originalError.call(this, message, data);
  };

  // Monkey-patch toast.warning
  const originalWarning = toast.warning;
  toast.warning = function (message: any, data: any) {
    if (lastClickedButton) {
      const btn = lastClickedButton;
      btn.classList.add("button-warning-flash");
      setTimeout(() => {
        btn.classList.remove("button-warning-flash");
      }, 600);
    }
    return originalWarning.call(this, message, data);
  };
}

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:p-4 group-[.toaster]:text-sm group-[.toaster]:font-semibold",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          // Dynamic theme-matching colors, borders and left-accent highlights
          success: "group-[.toaster]:bg-[color-mix(in_oklch,var(--success)_10%,var(--card))] group-[.toaster]:text-[color-mix(in_oklch,var(--success)_80%,var(--foreground))] group-[.toaster]:border-[color-mix(in_oklch,var(--success)_30%,var(--border))] group-[.toaster]:border-l-4 group-[.toaster]:border-l-[var(--success)]",
          error: "group-[.toaster]:bg-[color-mix(in_oklch,var(--destructive)_10%,var(--card))] group-[.toaster]:text-[color-mix(in_oklch,var(--destructive)_85%,var(--foreground))] group-[.toaster]:border-[color-mix(in_oklch,var(--destructive)_30%,var(--border))] group-[.toaster]:border-l-4 group-[.toaster]:border-l-[var(--destructive)]",
          warning: "group-[.toaster]:bg-[color-mix(in_oklch,var(--warning)_10%,var(--card))] group-[.toaster]:text-[color-mix(in_oklch,var(--warning)_85%,var(--foreground))] group-[.toaster]:border-[color-mix(in_oklch,var(--warning)_35%,var(--border))] group-[.toaster]:border-l-4 group-[.toaster]:border-l-[var(--warning)]",
          info: "group-[.toaster]:bg-[color-mix(in_oklch,var(--primary)_10%,var(--card))] group-[.toaster]:text-[color-mix(in_oklch,var(--primary)_80%,var(--foreground))] group-[.toaster]:border-[color-mix(in_oklch,var(--primary)_30%,var(--border))] group-[.toaster]:border-l-4 group-[.toaster]:border-l-[var(--primary)]",
        },
      }}
      icons={{
        success: <CheckCircle2 className="size-5 text-[var(--success)] shrink-0" />,
        warning: <AlertTriangle className="size-5 text-[var(--warning)] shrink-0 animate-bounce" />,
        error: <AlertCircle className="size-5 text-[var(--destructive)] shrink-0 animate-pulse" />,
        info: <Info className="size-5 text-[var(--primary)] shrink-0" />,
      }}
      {...props}
    />
  );
};

export { Toaster };
