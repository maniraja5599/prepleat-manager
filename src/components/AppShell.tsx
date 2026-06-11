import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { useStore } from "@/lib/store";
import logoAsset from "@/assets/eyas-logo.png.asset.json";

interface Props {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  showBrand?: boolean;
}

export function AppShell({ title, subtitle, right, children, showBrand }: Props) {
  const settings = useStore((s) => s.settings);
  const logo = settings.logoDataUrl || logoAsset.url;
  return (
    <div className="min-h-[100dvh] bg-background pb-28">
      <div className="max-w-md mx-auto">
        {showBrand && (
          <div className="px-5 pt-5 flex items-center gap-3">
            <img src={logo} alt={settings.businessName} className="size-10 rounded-full object-cover ring-2 ring-primary/20" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Welcome</p>
              <p className="text-sm font-semibold truncate">{settings.businessName}</p>
            </div>
          </div>
        )}
        {title && (
          <header className="px-5 pt-5 pb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-display font-semibold tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
            </div>
            {right}
          </header>
        )}
        <main className="px-5">{children}</main>
        <p className="text-center text-[10px] text-muted-foreground/70 mt-8 pb-2">
          Developed by{" "}
          <a href="https://www.instagram.com/maniraja__/" target="_blank" rel="noreferrer" className="font-semibold text-primary/80 hover:underline">ManiRaja</a>
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
