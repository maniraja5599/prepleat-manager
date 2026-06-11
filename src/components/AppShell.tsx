import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface Props {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, right, children }: Props) {
  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto">
        {title && (
          <header className="px-5 pt-6 pb-3 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-display font-semibold tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            {right}
          </header>
        )}
        <main className="px-5">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
