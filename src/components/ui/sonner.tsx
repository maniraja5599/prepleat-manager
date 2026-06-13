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
          // Distinct colors and borders based on type
          success: "group-[.toaster]:bg-[oklch(0.95_0.06_150)] dark:group-[.toaster]:bg-[oklch(0.25_0.06_150)] group-[.toaster]:text-[oklch(0.35_0.12_150)] group-[.toaster]:border-[oklch(0.55_0.13_150)]/40",
          error: "group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive group-[.toaster]:border-destructive/30",
          warning: "group-[.toaster]:bg-[oklch(0.95_0.08_75)] dark:group-[.toaster]:bg-[oklch(0.25_0.08_75)] group-[.toaster]:text-[oklch(0.4_0.12_60)] group-[.toaster]:border-[oklch(0.78_0.13_75)]/40",
          info: "group-[.toaster]:bg-blue-500/10 group-[.toaster]:text-blue-600 dark:group-[.toaster]:text-blue-400 group-[.toaster]:border-blue-500/30",
        },
      }}
      icons={{
        success: <CheckCircle2 className="size-5 text-[oklch(0.55_0.13_150)] shrink-0" />,
        warning: <AlertTriangle className="size-5 text-[oklch(0.78_0.13_75)] shrink-0 animate-bounce" />,
        error: <AlertCircle className="size-5 text-destructive shrink-0 animate-pulse" />,
        info: <Info className="size-5 text-blue-500 shrink-0" />,
      }}
      {...props}
    />
  );
};

export { Toaster };
