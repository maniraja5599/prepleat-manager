import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { useStore } from "@/lib/store";
import logoAsset from "@/assets/eyas-logo.png.asset.json";

interface Props {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  /** @deprecated brand strip now renders on every page automatically */
  showBrand?: boolean;
  wide?: boolean;
}

export function AppShell({ title, subtitle, right, children, wide }: Props) {
  const settings = useStore((s) => s.settings);
  const logo = settings.logoDataUrl || logoAsset.url;
  return (
    <div className="min-h-[100dvh] bg-background pb-28">
      <div className={wide ? "max-w-3xl mx-auto" : "max-w-md mx-auto"}>
        {/* Uniform brand strip — every page */}
        <div className="px-5 pt-4 pb-1 flex items-center gap-2.5">
          <img
            src={logo}
            alt={settings.businessName}
            className="size-8 rounded-full object-cover ring-1 ring-primary/25"
          />
          <p className="text-[13px] font-display font-semibold tracking-tight truncate">{settings.businessName}</p>
          <span className="ml-auto size-1.5 rounded-full bg-gold/60" aria-hidden />
        </div>

        {title && (
          <header className="px-5 pt-2 pb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-display font-semibold tracking-tight truncate">{title}</h1>
              {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
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
