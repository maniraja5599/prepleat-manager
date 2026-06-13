import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoAsset from "@/assets/eyas-logo.png";
import { Loader2, Mail, Lock, UserRound } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Eyas Saree Drapist" },
      { name: "description", content: "Sign in to manage your saree bookings, payments and customers." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "email" | "google" | "guest">(null);

  // If already signed in, bounce to home
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy("email");
    try {
      const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
      const { error } = await fn.bind(supabase.auth)({ email, password });
      if (error) throw error;
      toast.success(mode === "signin" ? "Welcome back!" : "Account created");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleGoogle() {
    setBusy("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error(error.message || "Google sign-in failed");
      setBusy(null);
    }
  }

  async function handleGuest() {
    setBusy("guest");
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      toast.error(error.message);
      setBusy(null);
      return;
    }
    toast.success("Welcome! You're using a guest account.");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 rounded-full overflow-hidden ring-2 ring-primary/30 mb-3">
            <img src={logoAsset} alt="" className="size-full rounded-full object-cover scale-[1.18]" />
          </div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Eyas Saree Drapist</h1>
          <p className="text-sm text-muted-foreground mt-1">PrePleat & Drape manager</p>
        </div>

        <div className="bg-card card-shadow rounded-3xl p-6 space-y-4">
          <div className="flex bg-secondary rounded-full p-1 text-sm">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded-full font-medium transition ${mode === "signin" ? "bg-background shadow" : "text-muted-foreground"}`}
            >Sign in</button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-full font-medium transition ${mode === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}
            >Create account</button>
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <label className="block">
              <span className="sr-only">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="email" inputMode="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-secondary text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </label>
            <label className="block">
              <span className="sr-only">Password</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={6}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-secondary text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </label>
            <button
              type="submit" disabled={busy !== null}
              className="w-full h-11 rounded-xl saree-gradient text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy === "email" ? <Loader2 className="size-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div className="flex-1 h-px bg-border" /> or <div className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={handleGoogle} disabled={busy !== null}
            className="w-full h-11 rounded-xl bg-background border border-input text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
          >
            {busy === "google" ? <Loader2 className="size-4 animate-spin" /> : (
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.3 9.14 5.38 12 5.38z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <button
            onClick={handleGuest} disabled={busy !== null}
            className="w-full h-11 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
          >
            {busy === "guest" ? <Loader2 className="size-4 animate-spin" /> : <UserRound className="size-4" />}
            Continue as guest
          </button>
          <p className="text-[11px] text-center text-muted-foreground">Guest data stays on this device and syncs when you sign in.</p>
        </div>
      </div>
    </div>
  );
}
