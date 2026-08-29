import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Tag,
  Settings,
  Sparkles,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  IndianRupee,
  RefreshCw,
  Gift,
  Zap,
  Calendar,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import {
  isSuperAdmin,
  subscribeToAllUsers,
  subscribeToCoupons,
  subscribeToSystemConfig,
  updateUserPlan,
  createCoupon,
  deleteCoupon,
  toggleCouponStatus,
  updateSystemConfig,
  type UserProfile,
  type Coupon,
  type SystemSubscriptionConfig,
  DEFAULT_CONFIG,
} from "@/lib/subscription";
import { onAppAuthStateChanged, type AppUser } from "@/integrations/firebase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "coupons" | "pricing">("overview");

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [config, setConfig] = useState<SystemSubscriptionConfig>(DEFAULT_CONFIG);

  // Users Tab state
  const [searchUser, setSearchUser] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "trial" | "paid" | "expired" | "suspended">("all");

  // Create Coupon Modal
  const [createCouponOpen, setCreateCouponOpen] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<"free_days" | "percent_discount" | "lifetime_free">("free_days");
  const [newCouponValue, setNewCouponValue] = useState<number>(30);
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<number>(0);
  const [newCouponDesc, setNewCouponDesc] = useState("");

  // System Config State
  const [configForm, setConfigForm] = useState<SystemSubscriptionConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const unsubAuth = onAppAuthStateChanged((u) => {
      setCurrentUser(u);
    });

    const unsubUsers = subscribeToAllUsers((u) => setUsers(u));
    const unsubCoupons = subscribeToCoupons((c) => setCoupons(c));
    const unsubConfig = subscribeToSystemConfig((cfg) => {
      setConfig(cfg);
      setConfigForm(cfg);
    });

    return () => {
      unsubAuth();
      unsubUsers();
      unsubCoupons();
      unsubConfig();
    };
  }, []);

  const isAdmin = isSuperAdmin(currentUser);

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="size-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="size-8" />
          </div>
          <h2 className="text-xl font-bold font-display">Developer Access Restricted</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            This Super-Admin Control Panel is strictly reserved for the authorized developer (manirajankg@gmail.com).
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="px-5 py-2.5 rounded-full saree-gradient text-white text-xs font-bold shadow-sm"
          >
            Return to Calendar
          </button>
        </div>
      </AppShell>
    );
  }

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const query = searchUser.toLowerCase();
    const matchQuery =
      u.email.toLowerCase().includes(query) ||
      (u.displayName && u.displayName.toLowerCase().includes(query)) ||
      u.uid.toLowerCase().includes(query);
    if (!matchQuery) return false;

    const now = new Date();
    const isExp = u.planExpiresAt && new Date(u.planExpiresAt) < now && u.plan !== "lifetime_free";

    if (userFilter === "trial") return u.plan === "trial" && !isExp;
    if (userFilter === "paid") return (u.plan === "monthly" || u.plan === "yearly" || u.plan === "lifetime_free") && !isExp;
    if (userFilter === "expired") return isExp;
    if (userFilter === "suspended") return u.plan === "suspended" || !u.isApproved;
    return true;
  });

  // KPI Calculations
  const now = new Date();
  const totalUsersCount = users.length;
  const activeTrialsCount = users.filter((u) => u.plan === "trial" && (!u.planExpiresAt || new Date(u.planExpiresAt) >= now)).length;
  const paidSubscribersCount = users.filter((u) => (u.plan === "monthly" || u.plan === "yearly" || u.plan === "lifetime_free") && (!u.planExpiresAt || new Date(u.planExpiresAt) >= now)).length;
  const expiredCount = users.filter((u) => u.planExpiresAt && new Date(u.planExpiresAt) < now && u.plan !== "lifetime_free").length;

  const handleGrantDays = async (uid: string, days: number, planName: "monthly" | "yearly") => {
    try {
      await updateUserPlan(uid, planName, days, undefined, true);
      toast.success(`Granted ${days} days of ${planName} plan!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update user plan");
    }
  };

  const handleGrantLifetime = async (uid: string) => {
    try {
      await updateUserPlan(uid, "lifetime_free", undefined, undefined, true, "VIP Lifetime Free Granted by Admin");
      toast.success("Granted 100% Lifetime VIP Free Access!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update plan");
    }
  };

  const handleToggleSuspend = async (u: UserProfile) => {
    const isCurrentlySuspended = u.plan === "suspended" || !u.isApproved;
    const newPlan = isCurrentlySuspended ? "monthly" : "suspended";
    try {
      await updateUserPlan(u.uid, newPlan, isCurrentlySuspended ? 30 : undefined, undefined, isCurrentlySuspended);
      toast.success(isCurrentlySuspended ? "User unsuspended and granted 30 days" : "User suspended");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSystemConfig(configForm);
      toast.success("Subscription pricing & config updated successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save configuration");
    }
  };

  const handleCreateCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    try {
      await createCoupon({
        code: newCouponCode.trim().toUpperCase(),
        type: newCouponType,
        value: Number(newCouponValue) || 30,
        maxUses: Number(newCouponMaxUses) || 0,
        description: newCouponDesc.trim() || undefined,
        isActive: true,
      });
      toast.success(`Coupon "${newCouponCode.toUpperCase()}" created successfully!`);
      setNewCouponCode("");
      setNewCouponDesc("");
      setCreateCouponOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create coupon");
    }
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5 pb-24 text-left">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card card-shadow rounded-3xl p-4 sm:p-5 border border-primary/20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/" })}
              className="size-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 cursor-pointer shrink-0"
              title="Return to Calendar"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black font-display text-foreground">
                  Developer Super-Admin
                </h1>
                <span className="px-2 py-0.5 rounded-full saree-gradient text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                  MASTER VIP 👑
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Logged in as <span className="font-semibold text-foreground">{currentUser?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("trigger-pricing-modal"))}
              className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="size-3.5 text-amber-500" />
              <span>Test Paywall</span>
            </button>
          </div>
        </div>

        {/* 4 Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1.5 bg-secondary/80 p-1.5 rounded-2xl border border-border/40">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1",
              activeTab === "overview"
                ? "bg-card text-primary shadow-xs font-extrabold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Sparkles className="size-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1",
              activeTab === "users"
                ? "bg-card text-primary shadow-xs font-extrabold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="size-3.5" />
            <span>Users ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("coupons")}
            className={cn(
              "py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1",
              activeTab === "coupons"
                ? "bg-card text-primary shadow-xs font-extrabold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Tag className="size-3.5" />
            <span>Coupons ({coupons.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("pricing")}
            className={cn(
              "py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1",
              activeTab === "pricing"
                ? "bg-card text-primary shadow-xs font-extrabold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">Config & Pricing</span>
            <span className="sm:hidden">Pricing</span>
          </button>
        </div>

        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === "overview" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card card-shadow rounded-2xl p-4 border border-border/40 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Users</span>
                <p className="text-2xl font-black font-display mt-1 text-foreground">{totalUsersCount}</p>
                <span className="text-[10px] text-muted-foreground">Registered Accounts</span>
              </div>

              <div className="bg-card card-shadow rounded-2xl p-4 border border-border/40 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Active Trials</span>
                <p className="text-2xl font-black font-display mt-1 text-amber-500">{activeTrialsCount}</p>
                <span className="text-[10px] text-muted-foreground">30-Day Free Trials</span>
              </div>

              <div className="bg-card card-shadow rounded-2xl p-4 border border-border/40 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paid Subscribers</span>
                <p className="text-2xl font-black font-display mt-1 text-emerald-600 dark:text-emerald-400">{paidSubscribersCount}</p>
                <span className="text-[10px] text-muted-foreground">Monthly / Yearly / VIP</span>
              </div>

              <div className="bg-card card-shadow rounded-2xl p-4 border border-border/40 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">Expired Accounts</span>
                <p className="text-2xl font-black font-display mt-1 text-destructive">{expiredCount}</p>
                <span className="text-[10px] text-muted-foreground">Pending Renewal</span>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-card card-shadow rounded-3xl p-5 border border-border/40 space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                <span>Quick Developer Actions</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={() => setActiveTab("users")}
                  className="p-3.5 rounded-2xl bg-secondary hover:bg-secondary/80 transition text-left cursor-pointer border border-border/30"
                >
                  <p className="text-xs font-bold text-foreground">Manage Users & Expiries</p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">Extend +30 days, +1 year, or grant lifetime access.</p>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("coupons");
                    setCreateCouponOpen(true);
                  }}
                  className="p-3.5 rounded-2xl bg-secondary hover:bg-secondary/80 transition text-left cursor-pointer border border-border/30"
                >
                  <p className="text-xs font-bold text-foreground">+ Create Promo Coupon</p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">Generate free months or discount codes for clients.</p>
                </button>

                <button
                  onClick={() => setActiveTab("pricing")}
                  className="p-3.5 rounded-2xl bg-secondary hover:bg-secondary/80 transition text-left cursor-pointer border border-border/30"
                >
                  <p className="text-xs font-bold text-foreground">Update Pricing & Deals</p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">Change monthly/yearly plan rates on the fly.</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: USERS DIRECTORY ================= */}
        {activeTab === "users" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Search by email, name, or ID..."
                  className="w-full bg-card border border-border rounded-2xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto pb-1">
                {(["all", "trial", "paid", "expired", "suspended"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setUserFilter(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap cursor-pointer transition",
                      userFilter === f
                        ? "bg-primary text-white shadow-2xs"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Users List */}
            {filteredUsers.length === 0 ? (
              <div className="bg-card card-shadow rounded-3xl p-8 text-center text-sm text-muted-foreground">
                No users found matching your search.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredUsers.map((u) => {
                  const isExp = u.planExpiresAt && new Date(u.planExpiresAt) < now && u.plan !== "lifetime_free";
                  const isMasterAdmin = isSuperAdmin({ id: u.uid, email: u.email, isAnonymous: false });

                  return (
                    <div
                      key={u.uid}
                      className="bg-card card-shadow rounded-3xl p-4 border border-border/40 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{u.email}</span>
                            {isMasterAdmin ? (
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase">
                                Super Admin 👑
                              </span>
                            ) : u.plan === "lifetime_free" ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase">
                                Lifetime Free VIP ✨
                              </span>
                            ) : isExp ? (
                              <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase">
                                Expired ⚠️
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase">
                                {u.plan} Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Joined: {new Date(u.createdAt).toLocaleDateString()} · Last seen:{" "}
                            {new Date(u.lastLoginAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-xs font-semibold text-foreground">
                            {u.plan === "lifetime_free" || isMasterAdmin
                              ? "Permanent Access"
                              : u.planExpiresAt
                                ? `Valid until: ${new Date(u.planExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                                : "No Expiry Set"}
                          </p>
                          {u.notes && <p className="text-[10px] text-muted-foreground italic truncate max-w-xs">{u.notes}</p>}
                        </div>
                      </div>

                      {/* Admin Action Buttons */}
                      {!isMasterAdmin && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/30">
                          <button
                            onClick={() => handleGrantDays(u.uid, 30, "monthly")}
                            className="px-2.5 py-1 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-bold text-foreground cursor-pointer"
                          >
                            +30 Days Free
                          </button>

                          <button
                            onClick={() => handleGrantDays(u.uid, 365, "yearly")}
                            className="px-2.5 py-1 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-bold text-foreground cursor-pointer"
                          >
                            +1 Year Plan
                          </button>

                          <button
                            onClick={() => handleGrantLifetime(u.uid)}
                            className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold cursor-pointer"
                          >
                            Grant Lifetime VIP
                          </button>

                          <button
                            onClick={() => handleToggleSuspend(u)}
                            className={cn(
                              "px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer",
                              u.plan === "suspended"
                                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                : "bg-destructive/10 text-destructive hover:bg-destructive/20",
                            )}
                          >
                            {u.plan === "suspended" ? "Unsuspend" : "Suspend"}
                          </button>

                          {config.supportWhatsapp && (
                            <button
                              onClick={() => {
                                const msg = encodeURIComponent(`Hello from Saree PrePleat Manager! This is regarding your account (${u.email}).`);
                                window.open(`https://wa.me/?text=${msg}`, "_blank");
                              }}
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <MessageCircle className="size-3" />
                              <span>WhatsApp</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: COUPONS MANAGER ================= */}
        {activeTab === "coupons" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold font-display">Active Promo Coupons</h2>
                <p className="text-xs text-muted-foreground">Manage discount codes and free extension offers.</p>
              </div>
              <button
                onClick={() => setCreateCouponOpen(true)}
                className="px-3.5 py-2 rounded-2xl saree-gradient text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="size-3.5 stroke-[3]" />
                <span>New Coupon</span>
              </button>
            </div>

            {/* Coupons List */}
            {coupons.length === 0 ? (
              <div className="bg-card card-shadow rounded-3xl p-8 text-center text-sm text-muted-foreground space-y-2">
                <Tag className="size-8 text-muted-foreground/50 mx-auto" />
                <p>No coupon codes created yet.</p>
                <button
                  onClick={() => setCreateCouponOpen(true)}
                  className="text-xs text-primary font-bold hover:underline cursor-pointer"
                >
                  Create your first coupon (e.g. LAUNCH100)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className="bg-card card-shadow rounded-3xl p-4 border border-border/40 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-sm text-foreground tracking-wider bg-secondary px-2.5 py-1 rounded-xl border border-border">
                            {c.code}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase",
                              c.isActive
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {c.isActive ? "Active" : "Disabled"}
                          </span>
                        </div>

                        <button
                          onClick={() => deleteCoupon(c.id)}
                          className="size-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center cursor-pointer"
                          title="Delete Coupon"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <div className="mt-2.5 space-y-1">
                        <p className="text-xs font-bold text-foreground">
                          {c.type === "lifetime_free"
                            ? "🎁 100% Lifetime VIP Free Access"
                            : c.type === "free_days"
                              ? `🎁 +${c.value} Days Free Extension`
                              : `🏷️ ${c.value}% Discount Offer`}
                        </p>
                        {c.description && <p className="text-[11px] text-muted-foreground">{c.description}</p>}
                        <p className="text-[10px] text-muted-foreground">
                          Used: <span className="font-bold text-foreground">{c.usedCount}</span>
                          {c.maxUses > 0 ? ` / ${c.maxUses} max` : " (Unlimited uses)"}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                      <button
                        onClick={() => toggleCouponStatus(c.id, !c.isActive)}
                        className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        {c.isActive ? "Disable Code" : "Activate Code"}
                      </button>
                      <span className="text-[10px] text-muted-foreground">
                        {c.expiresAt ? `Exp: ${new Date(c.expiresAt).toLocaleDateString()}` : "No Expiry"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: CONFIG & PRICING ================= */}
        {activeTab === "pricing" && (
          <form
            onSubmit={handleSaveConfig}
            className="bg-card card-shadow rounded-3xl p-5 border border-border/40 space-y-4 animate-in fade-in duration-200"
          >
            <div>
              <h2 className="text-base font-bold font-display">Subscription Pricing & Trial Setup</h2>
              <p className="text-xs text-muted-foreground">
                Changes made here take effect immediately for all new and renewing users.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Default Free Trial Duration (Days)
                </label>
                <input
                  type="number"
                  value={configForm.trialDays}
                  onChange={(e) => setConfigForm({ ...configForm, trialDays: Number(e.target.value) })}
                  className="w-full bg-secondary rounded-xl px-3 py-2 text-sm font-bold border border-border focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-muted-foreground">New signups get 30 days free by default.</span>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Monthly Plan Price (₹)
                </label>
                <input
                  type="number"
                  value={configForm.monthlyPrice}
                  onChange={(e) => setConfigForm({ ...configForm, monthlyPrice: Number(e.target.value) })}
                  className="w-full bg-secondary rounded-xl px-3 py-2 text-sm font-bold border border-border focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Yearly Plan Offer Price (₹)
                </label>
                <input
                  type="number"
                  value={configForm.yearlyPrice}
                  onChange={(e) => setConfigForm({ ...configForm, yearlyPrice: Number(e.target.value) })}
                  className="w-full bg-secondary rounded-xl px-3 py-2 text-sm font-bold border border-border focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-emerald-600 font-semibold">Special Discounted Yearly Rate</span>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Yearly Original Price (₹ Strike-through)
                </label>
                <input
                  type="number"
                  value={configForm.yearlyOriginalPrice}
                  onChange={(e) => setConfigForm({ ...configForm, yearlyOriginalPrice: Number(e.target.value) })}
                  className="w-full bg-secondary rounded-xl px-3 py-2 text-sm font-bold border border-border focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Support / Payment WhatsApp Number
                </label>
                <input
                  type="text"
                  value={configForm.supportWhatsapp}
                  onChange={(e) => setConfigForm({ ...configForm, supportWhatsapp: e.target.value })}
                  placeholder="e.g. 919876543210 (with country code)"
                  className="w-full bg-secondary rounded-xl px-3 py-2 text-sm font-bold border border-border focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Developer UPI ID (GPay / PhonePe)
                </label>
                <input
                  type="text"
                  value={configForm.supportUpiId || ""}
                  onChange={(e) => setConfigForm({ ...configForm, supportUpiId: e.target.value })}
                  placeholder="e.g. yourname@okaxis"
                  className="w-full bg-secondary rounded-xl px-3 py-2 text-sm font-bold border border-border focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl saree-gradient text-white text-xs font-bold shadow-md hover:opacity-95 active:scale-[0.98] transition cursor-pointer uppercase tracking-wider"
            >
              Save Configuration Changes
            </button>
          </form>
        )}

        {/* Modal: Create Coupon */}
        {createCouponOpen && (
          <div
            className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setCreateCouponOpen(false)}
          >
            <form
              onSubmit={handleCreateCouponSubmit}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-border/60 space-y-4 animate-in zoom-in-95"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-foreground">Create New Promo Coupon</h3>
                <button
                  type="button"
                  onClick={() => setCreateCouponOpen(false)}
                  className="size-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Coupon Code
                </label>
                <input
                  required
                  type="text"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. LAUNCH100, PREPLEAT50, VIPFREE"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm uppercase font-bold tracking-wider focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Coupon Benefit Type
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewCouponType("free_days")}
                    className={cn(
                      "py-2 px-1 rounded-xl text-xs font-bold border transition cursor-pointer text-center",
                      newCouponType === "free_days"
                        ? "bg-primary text-white border-primary"
                        : "bg-secondary text-foreground border-transparent",
                    )}
                  >
                    + Free Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCouponType("lifetime_free")}
                    className={cn(
                      "py-2 px-1 rounded-xl text-xs font-bold border transition cursor-pointer text-center",
                      newCouponType === "lifetime_free"
                        ? "bg-primary text-white border-primary"
                        : "bg-secondary text-foreground border-transparent",
                    )}
                  >
                    Lifetime VIP
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCouponType("percent_discount")}
                    className={cn(
                      "py-2 px-1 rounded-xl text-xs font-bold border transition cursor-pointer text-center",
                      newCouponType === "percent_discount"
                        ? "bg-primary text-white border-primary"
                        : "bg-secondary text-foreground border-transparent",
                    )}
                  >
                    % Discount
                  </button>
                </div>
              </div>

              {newCouponType !== "lifetime_free" && (
                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    {newCouponType === "free_days" ? "Days to Add (e.g. 30, 90, 365)" : "Discount Percentage (% Off)"}
                  </label>
                  <input
                    required
                    type="number"
                    value={newCouponValue}
                    onChange={(e) => setNewCouponValue(Number(e.target.value))}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Max Uses Limit (0 for unlimited)
                </label>
                <input
                  type="number"
                  value={newCouponMaxUses}
                  onChange={(e) => setNewCouponMaxUses(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Note / Description
                </label>
                <input
                  type="text"
                  value={newCouponDesc}
                  onChange={(e) => setNewCouponDesc(e.target.value)}
                  placeholder="e.g. Launch special for Instagram followers"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateCouponOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl saree-gradient text-white text-xs font-bold shadow-sm"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
