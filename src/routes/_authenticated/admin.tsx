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
  Edit3,
  ExternalLink,
  HelpCircle,
  CreditCard,
  Crown,
  Layers,
  ArrowUpRight,
  Phone,
  Eye,
  Copy,
  Check,
  UserCheck,
  CalendarDays,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import {
  isSuperAdmin,
  subscribeToAllUsers,
  subscribeToCoupons,
  subscribeToSystemConfig,
  updateUserPlan,
  deleteUserProfile,
  processReferralReward,
  createCoupon,
  deleteCoupon,
  toggleCouponStatus,
  updateSystemConfig,
  type UserProfile,
  type Coupon,
  type SystemSubscriptionConfig,
  type SubscriptionPlan,
  DEFAULT_CONFIG,
} from "@/lib/subscription";
import { onAppAuthStateChanged, type AppUser } from "@/integrations/firebase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "coupons" | "pricing">("users");

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [config, setConfig] = useState<SystemSubscriptionConfig>(DEFAULT_CONFIG);

  // Users Tab state
  const [searchUser, setSearchUser] = useState("");
  const [userFilter, setUserFilter] = useState<
    "all" | "monthly" | "yearly" | "trial" | "lifetime" | "expired" | "suspended"
  >("all");

  // Inspect User Details Modal
  const [inspectingUser, setInspectingUser] = useState<UserProfile | null>(null);

  // Edit User Plan Modal
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editPlanType, setEditPlanType] = useState<SubscriptionPlan>("monthly");
  const [editExpiryDate, setEditExpiryDate] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editIsApproved, setEditIsApproved] = useState<boolean>(true);

  // Delete User State
  const [pendingDeleteUser, setPendingDeleteUser] = useState<UserProfile | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

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

  // Open Edit User Modal
  const handleOpenEditUser = (u: UserProfile) => {
    setEditingUser(u);
    setEditPlanType(u.plan);
    const dateStr = u.planExpiresAt ? u.planExpiresAt.slice(0, 10) : "";
    setEditExpiryDate(dateStr);
    setEditNotes(u.notes || "");
    setEditIsApproved(u.isApproved !== false);
  };

  const handleSaveUserPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateUserPlan(
        editingUser.uid,
        editPlanType,
        undefined,
        editPlanType === "lifetime_free" ? null : editExpiryDate ? `${editExpiryDate}T23:59:59.000Z` : undefined,
        editIsApproved,
        editNotes.trim() || undefined,
      );
      toast.success(`Updated plan for ${editingUser.email} successfully!`);
      setEditingUser(null);
      if (inspectingUser?.uid === editingUser.uid) {
        setInspectingUser(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update user plan");
    }
  };

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
      await updateUserPlan(uid, "lifetime_free", undefined, null, true, "VIP Lifetime Free Granted by Admin");
      toast.success("Granted 100% Lifetime VIP Free Access!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update plan");
    }
  };

  const handleDeleteUser = async () => {
    if (!pendingDeleteUser) return;
    try {
      await deleteUserProfile(pendingDeleteUser.uid);
      toast.success(`User ${pendingDeleteUser.email} removed.`);
      setPendingDeleteUser(null);
      if (inspectingUser?.uid === pendingDeleteUser.uid) {
        setInspectingUser(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove user");
    }
  };

  const handleRewardReferral = async (u: UserProfile) => {
    try {
      const res = await processReferralReward(u.referralCode || u.uid, 30);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to reward referral");
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
      toast.success("Subscription pricing & Cashfree setup saved successfully!");
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

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
    toast.success("User UID copied!");
  };

  const now = new Date();

  // Counts for filters
  const totalCount = users.length;
  const monthlyCount = users.filter((u) => u.plan === "monthly" && (!u.planExpiresAt || new Date(u.planExpiresAt) >= now)).length;
  const yearlyCount = users.filter((u) => u.plan === "yearly" && (!u.planExpiresAt || new Date(u.planExpiresAt) >= now)).length;
  const trialCount = users.filter((u) => u.plan === "trial" && (!u.planExpiresAt || new Date(u.planExpiresAt) >= now)).length;
  const lifetimeCount = users.filter((u) => u.plan === "lifetime_free").length;
  const expiredCount = users.filter((u) => u.planExpiresAt && new Date(u.planExpiresAt) < now && u.plan !== "lifetime_free").length;
  const suspendedCount = users.filter((u) => u.plan === "suspended" || !u.isApproved).length;

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const query = searchUser.toLowerCase();
    const matchQuery =
      u.email.toLowerCase().includes(query) ||
      (u.displayName && u.displayName.toLowerCase().includes(query)) ||
      u.uid.toLowerCase().includes(query) ||
      (u.phone && u.phone.includes(query)) ||
      (u.referralCode && u.referralCode.toLowerCase().includes(query));
    if (!matchQuery) return false;

    const isExp = u.planExpiresAt && new Date(u.planExpiresAt) < now && u.plan !== "lifetime_free";

    if (userFilter === "monthly") return u.plan === "monthly" && !isExp;
    if (userFilter === "yearly") return u.plan === "yearly" && !isExp;
    if (userFilter === "trial") return u.plan === "trial" && !isExp;
    if (userFilter === "lifetime") return u.plan === "lifetime_free";
    if (userFilter === "expired") return isExp;
    if (userFilter === "suspended") return u.plan === "suspended" || !u.isApproved;
    return true;
  });

  return (
    <AppShell wide>
      <div className="w-full max-w-6xl mx-auto space-y-4 pb-32 text-left">
        {/* Top Hero Header */}
        <div className="relative overflow-hidden bg-card card-shadow rounded-3xl p-4 sm:p-5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/" })}
              className="size-9 rounded-2xl bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition cursor-pointer shrink-0"
              title="Return to Calendar"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black font-display text-foreground">
                  Developer Super-Admin
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full saree-gradient text-white text-[9.5px] font-black uppercase tracking-wider shadow-xs">
                  <Crown className="size-3" />
                  <span>VIP</span>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Developer Master: <span className="font-semibold text-foreground">{currentUser?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("trigger-pricing-modal"))}
              className="px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Zap className="size-3.5 text-primary" />
              <span>Test Paywall</span>
            </button>
          </div>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1.5 bg-secondary/80 p-1.5 rounded-2xl border border-border/50">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "py-2.5 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
              activeTab === "overview"
                ? "bg-card text-primary shadow-xs font-extrabold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Sparkles className="size-3.5 shrink-0" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "py-2.5 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
              activeTab === "users"
                ? "bg-card text-primary shadow-xs font-extrabold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="size-3.5 shrink-0" />
            <span>Users ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("coupons")}
            className={cn(
              "py-2.5 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
              activeTab === "coupons"
                ? "bg-card text-primary shadow-xs font-extrabold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Tag className="size-3.5 shrink-0" />
            <span>Coupons ({coupons.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("pricing")}
            className={cn(
              "py-2.5 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
              activeTab === "pricing"
                ? "bg-card text-primary shadow-xs font-extrabold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Settings className="size-3.5 shrink-0" />
            <span>Pricing & Gateway</span>
          </button>
        </div>

        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === "overview" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* 4 Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-card card-shadow rounded-2xl p-4 border border-border/50 flex flex-col justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Users</span>
                <p className="text-3xl font-black font-display my-1 text-foreground">{totalCount}</p>
                <span className="text-xs text-muted-foreground">All Registered Accounts</span>
              </div>

              <div className="bg-card card-shadow rounded-2xl p-4 border border-border/50 flex flex-col justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Active Trials</span>
                <p className="text-3xl font-black font-display my-1 text-amber-500">{trialCount}</p>
                <span className="text-xs text-muted-foreground">30-Day Free Trial Users</span>
              </div>

              <div className="bg-card card-shadow rounded-2xl p-4 border border-border/50 flex flex-col justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Paid Subscribers</span>
                <p className="text-3xl font-black font-display my-1 text-emerald-600 dark:text-emerald-400">{monthlyCount + yearlyCount + lifetimeCount}</p>
                <span className="text-xs text-muted-foreground">{yearlyCount} Yearly · {monthlyCount} Monthly</span>
              </div>

              <div className="bg-card card-shadow rounded-2xl p-4 border border-border/50 flex flex-col justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">Expired Accounts</span>
                <p className="text-3xl font-black font-display my-1 text-destructive">{expiredCount}</p>
                <span className="text-xs text-muted-foreground">Pending Renewal</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card card-shadow rounded-3xl p-5 border border-border/40 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                <span>Quick Developer Actions</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setActiveTab("users")}
                  className="p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition text-left cursor-pointer border border-border/30 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-foreground">Manage Users & Expiries</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Extend +30d, +1yr, edit dates, or inspect details.</p>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground shrink-0 ml-2" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab("coupons");
                    setCreateCouponOpen(true);
                  }}
                  className="p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition text-left cursor-pointer border border-border/30 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-foreground">+ Create Promo Coupon</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Generate free months or discount codes.</p>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground shrink-0 ml-2" />
                </button>

                <button
                  onClick={() => setActiveTab("pricing")}
                  className="p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition text-left cursor-pointer border border-border/30 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-foreground">Pricing & Cashfree Setup</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Configure Cashfree keys and rates.</p>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground shrink-0 ml-2" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: USERS DIRECTORY (EXPANDABLE / CLICKABLE) ================= */}
        {activeTab === "users" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Search & Comprehensive Filters */}
            <div className="flex flex-col md:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Search by email, name, phone, referral code, or UID..."
                  className="w-full bg-card border border-border rounded-2xl pl-10 pr-3 py-2.5 text-xs focus:outline-none focus:border-primary font-medium"
                />
              </div>

              {/* Filter Pills with Counts */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: "all" as const, label: `All (${totalCount})` },
                  { id: "yearly" as const, label: `Yearly (${yearlyCount})` },
                  { id: "monthly" as const, label: `Monthly (${monthlyCount})` },
                  { id: "trial" as const, label: `Trials (${trialCount})` },
                  { id: "lifetime" as const, label: `VIP Lifetime (${lifetimeCount})` },
                  { id: "expired" as const, label: `Expired (${expiredCount})` },
                  { id: "suspended" as const, label: `Suspended (${suspendedCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setUserFilter(f.id)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition",
                      userFilter === f.id
                        ? "bg-primary text-white shadow-2xs"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Responsive Grid (1 col mobile, 2 col tablet, 3 col desktop) */}
            {filteredUsers.length === 0 ? (
              <div className="bg-card card-shadow rounded-3xl p-10 text-center text-sm text-muted-foreground">
                No users found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredUsers.map((u) => {
                  const isExp = u.planExpiresAt && new Date(u.planExpiresAt) < now && u.plan !== "lifetime_free";
                  const isMasterAdmin = isSuperAdmin({ id: u.uid, email: u.email, isAnonymous: false });

                  // Days remaining calculation
                  let daysRemaining: number | null = null;
                  if (u.planExpiresAt && u.plan !== "lifetime_free") {
                    const diffTime = new Date(u.planExpiresAt).getTime() - now.getTime();
                    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  }

                  return (
                    <div
                      key={u.uid}
                      onClick={() => setInspectingUser(u)}
                      className="group bg-card card-shadow rounded-3xl p-4 border border-border/50 hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between space-y-3 active:scale-[0.99]"
                    >
                      <div>
                        {/* Header: Email + Plan Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {u.email}
                            </p>
                            {u.displayName && (
                              <p className="text-[11px] text-muted-foreground truncate">{u.displayName}</p>
                            )}
                          </div>

                          {isMasterAdmin ? (
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9.5px] font-black uppercase shrink-0">
                              SUPER ADMIN 👑
                            </span>
                          ) : u.plan === "lifetime_free" ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[9.5px] font-bold uppercase shrink-0">
                              VIP LIFETIME ✨
                            </span>
                          ) : isExp ? (
                            <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[9.5px] font-bold uppercase shrink-0">
                              EXPIRED ⚠️
                            </span>
                          ) : u.plan === "yearly" ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9.5px] font-black uppercase shrink-0">
                              YEARLY ACTIVE 💎
                            </span>
                          ) : u.plan === "monthly" ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9.5px] font-black uppercase shrink-0">
                              MONTHLY ACTIVE ⚡
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9.5px] font-bold uppercase shrink-0">
                              30D TRIAL ⏳
                            </span>
                          )}
                        </div>

                        {/* Phone / Contact */}
                        {u.phone && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                            <Phone className="size-3 text-primary" />
                            <span>+91 {u.phone}</span>
                          </p>
                        )}

                        {/* Validity & Countdown */}
                        <div className="mt-2 text-xs">
                          {u.plan === "lifetime_free" || isMasterAdmin ? (
                            <span className="text-muted-foreground font-semibold">Permanent Access</span>
                          ) : u.planExpiresAt ? (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground text-[11px]">
                                Valid until:{" "}
                                <strong className="text-foreground">
                                  {new Date(u.planExpiresAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </strong>
                              </span>
                              {daysRemaining !== null && (
                                <span
                                  className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                                    daysRemaining > 30
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : daysRemaining > 0
                                        ? "bg-amber-500/10 text-amber-600"
                                        : "bg-destructive/10 text-destructive",
                                  )}
                                >
                                  {daysRemaining > 0 ? `${daysRemaining}d left` : "Expired"}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">No Expiry Set</span>
                          )}
                        </div>

                        {/* Referral Code & Stats */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
                          <span className="bg-secondary px-2 py-0.5 rounded-md font-mono font-bold text-primary">
                            {u.referralCode || "NO-CODE"}
                          </span>
                          <span>
                            Referrals: <strong className="text-foreground">{u.referralCount || 0}</strong> ({u.freeMonthsEarned || 0} mos)
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons (1-click from card) */}
                      {!isMasterAdmin && (
                        <div
                          className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/30"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="px-2.5 py-1 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="size-3" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleGrantDays(u.uid, 30, "monthly")}
                            className="px-2 py-1 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-bold text-foreground cursor-pointer"
                          >
                            +30d
                          </button>

                          <button
                            onClick={() => handleGrantDays(u.uid, 365, "yearly")}
                            className="px-2 py-1 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-bold text-foreground cursor-pointer"
                          >
                            +1yr
                          </button>

                          <button
                            onClick={() => setInspectingUser(u)}
                            className="p-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer ml-auto"
                            title="View Full User Details"
                          >
                            <Eye className="size-3.5" />
                          </button>

                          <button
                            onClick={() => setPendingDeleteUser(u)}
                            className="p-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold cursor-pointer"
                            title="Remove User Account"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
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

            {/* Coupons Grid */}
            {coupons.length === 0 ? (
              <div className="bg-card card-shadow rounded-3xl p-10 text-center text-sm text-muted-foreground space-y-2">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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

        {/* ================= TAB 4: PRICING & CASHFREE SETUP ================= */}
        {activeTab === "pricing" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Cashfree Guide */}
            <div className="bg-primary/5 border border-primary/30 rounded-3xl p-5 space-y-2.5">
              <div className="flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                <h3 className="font-display font-bold text-sm text-foreground">
                  Cashfree Payment Gateway Integration Guide
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Accept automatic credit card, netbanking, and UPI payments directly in the app:
              </p>
              <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1 pl-1">
                <li>Register a merchant account at <strong className="text-foreground">merchant.cashfree.com</strong>.</li>
                <li>Go to <strong className="text-foreground">Developers → API Keys</strong>.</li>
                <li>Copy your <strong className="text-foreground">App ID</strong> and <strong className="text-foreground">Secret Key</strong> and paste them below.</li>
                <li>Set Environment to <strong className="text-foreground">TEST (Sandbox)</strong> for testing, then switch to <strong className="text-foreground">PROD (Live)</strong> when verified.</li>
              </ol>
            </div>

            <form
              onSubmit={handleSaveConfig}
              className="bg-card card-shadow rounded-3xl p-5 sm:p-6 border border-border/40 space-y-4"
            >
              <div>
                <h2 className="text-base font-bold font-display">Subscription Pricing & Gateway Settings</h2>
                <p className="text-xs text-muted-foreground">
                  Changes take effect immediately across all client devices.
                </p>
              </div>

              {/* Environment Toggle */}
              <div className="bg-secondary/50 rounded-2xl p-3 border border-border flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-foreground block">Cashfree Environment</label>
                  <p className="text-[10.5px] text-muted-foreground">Current mode: {configForm.cashfreeEnv === "PROD" ? "🔴 Production (LIVE)" : "🟡 Sandbox (TEST)"}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setConfigForm({ ...configForm, cashfreeEnv: "TEST" })}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition",
                      configForm.cashfreeEnv === "TEST" ? "bg-amber-500 text-white shadow-xs" : "bg-card text-muted-foreground",
                    )}
                  >
                    TEST
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigForm({ ...configForm, cashfreeEnv: "PROD" })}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition",
                      configForm.cashfreeEnv === "PROD" ? "bg-emerald-600 text-white shadow-xs" : "bg-card text-muted-foreground",
                    )}
                  >
                    LIVE (PROD)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Free Trial Duration (Days)
                  </label>
                  <input
                    type="number"
                    value={configForm.trialDays}
                    onChange={(e) => setConfigForm({ ...configForm, trialDays: Number(e.target.value) })}
                    className="w-full bg-secondary rounded-xl px-3 py-2.5 text-xs font-bold border border-border focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Monthly Plan Price (₹)
                  </label>
                  <input
                    type="number"
                    value={configForm.monthlyPrice}
                    onChange={(e) => setConfigForm({ ...configForm, monthlyPrice: Number(e.target.value) })}
                    className="w-full bg-secondary rounded-xl px-3 py-2.5 text-xs font-bold border border-border focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Yearly Plan Offer Price (₹)
                  </label>
                  <input
                    type="number"
                    value={configForm.yearlyPrice}
                    onChange={(e) => setConfigForm({ ...configForm, yearlyPrice: Number(e.target.value) })}
                    className="w-full bg-secondary rounded-xl px-3 py-2.5 text-xs font-bold border border-border focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Yearly Strike-Through Price (₹)
                  </label>
                  <input
                    type="number"
                    value={configForm.yearlyOriginalPrice}
                    onChange={(e) => setConfigForm({ ...configForm, yearlyOriginalPrice: Number(e.target.value) })}
                    className="w-full bg-secondary rounded-xl px-3 py-2.5 text-xs font-bold border border-border focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Cashfree App ID (Client ID)
                  </label>
                  <input
                    type="text"
                    value={configForm.cashfreeAppId || ""}
                    onChange={(e) => setConfigForm({ ...configForm, cashfreeAppId: e.target.value })}
                    placeholder="e.g. TEST1120290946507dc3d9f01ff4148790920211"
                    className="w-full bg-secondary rounded-xl px-3 py-2.5 text-xs font-mono font-bold border border-border focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Cashfree Secret Key
                  </label>
                  <input
                    type="text"
                    value={configForm.cashfreeSecretKey || ""}
                    onChange={(e) => setConfigForm({ ...configForm, cashfreeSecretKey: e.target.value })}
                    placeholder="e.g. cfsk_ma_test_..."
                    className="w-full bg-secondary rounded-xl px-3 py-2.5 text-xs font-mono font-bold border border-border focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Support WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={configForm.supportWhatsapp}
                    onChange={(e) => setConfigForm({ ...configForm, supportWhatsapp: e.target.value })}
                    placeholder="e.g. 919159036301"
                    className="w-full bg-secondary rounded-xl px-3 py-2.5 text-xs font-bold border border-border focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Direct UPI ID (GPay / PhonePe)
                  </label>
                  <input
                    type="text"
                    value={configForm.supportUpiId || ""}
                    onChange={(e) => setConfigForm({ ...configForm, supportUpiId: e.target.value })}
                    placeholder="e.g. manirajankg@okaxis"
                    className="w-full bg-secondary rounded-xl px-3 py-2.5 text-xs font-bold border border-border focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl saree-gradient text-white text-xs font-bold shadow-md hover:opacity-95 active:scale-[0.98] transition cursor-pointer uppercase tracking-wider"
              >
                Save Configuration Changes
              </button>
            </form>
          </div>
        )}

        {/* ================= MODAL 1: FULL USER DETAILS INSPECTOR ================= */}
        {inspectingUser && (
          <div
            className="fixed inset-0 z-[31000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setInspectingUser(null)}
            style={{ touchAction: "none" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-primary/30 space-y-4 animate-in zoom-in-95 text-left max-h-[90vh] overflow-y-auto"
              style={{ touchAction: "auto" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20">
                    {inspectingUser.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm sm:text-base text-foreground">
                      {inspectingUser.email}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {inspectingUser.displayName || "Client Account"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectingUser(null)}
                  className="size-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Plan & Validity Card */}
              <div className="bg-secondary/40 rounded-2xl p-4 border border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Current Plan</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase">
                    {inspectingUser.plan.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Plan Expiry:</span>
                  <span className="text-xs font-bold text-foreground">
                    {inspectingUser.plan === "lifetime_free"
                      ? "Permanent Access ✨"
                      : inspectingUser.planExpiresAt
                        ? new Date(inspectingUser.planExpiresAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "No Expiry"}
                  </span>
                </div>
                {inspectingUser.notes && (
                  <div className="pt-2 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Payment Note</span>
                    <p className="text-xs text-foreground mt-0.5">{inspectingUser.notes}</p>
                  </div>
                )}
              </div>

              {/* Contact & Phone */}
              <div className="bg-secondary/40 rounded-2xl p-4 border border-border/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Contact & Mobile</span>
                  {inspectingUser.phone ? (
                    <a
                      href={`https://wa.me/91${inspectingUser.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition"
                    >
                      <MessageCircle className="size-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-amber-600 font-bold">No Phone Added</span>
                  )}
                </div>
                <p className="text-xs text-foreground font-bold">
                  {inspectingUser.phone ? `+91 ${inspectingUser.phone}` : "User hasn't entered phone number yet"}
                </p>
              </div>

              {/* Account Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-secondary/30 p-3 rounded-xl border border-border/30">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Joined Date</span>
                  <span className="font-semibold text-foreground">
                    {new Date(inspectingUser.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <div className="bg-secondary/30 p-3 rounded-xl border border-border/30">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Last Active</span>
                  <span className="font-semibold text-foreground">
                    {new Date(inspectingUser.lastLoginAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <div className="bg-secondary/30 p-3 rounded-xl border border-border/30">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Invite Code</span>
                  <span className="font-mono font-bold text-primary">{inspectingUser.referralCode || "N/A"}</span>
                </div>
                <div className="bg-secondary/30 p-3 rounded-xl border border-border/30">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Friends Invited</span>
                  <span className="font-bold text-foreground">{inspectingUser.referralCount || 0} ({inspectingUser.freeMonthsEarned || 0} mos earned)</span>
                </div>
              </div>

              {/* UID */}
              <div className="flex items-center justify-between bg-secondary/30 p-2.5 rounded-xl border border-border/30 text-xs">
                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[240px]">
                  UID: {inspectingUser.uid}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyUid(inspectingUser.uid)}
                  className="px-2 py-1 rounded-lg bg-card border border-border text-[10px] font-bold text-foreground hover:bg-secondary cursor-pointer flex items-center gap-1"
                >
                  {copiedUid ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  <span>{copiedUid ? "Copied" : "Copy UID"}</span>
                </button>
              </div>

              {/* Developer Action Suite */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Quick Actions
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setInspectingUser(null);
                      handleOpenEditUser(inspectingUser);
                    }}
                    className="p-2.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Edit3 className="size-3.5" />
                    <span>Edit Plan</span>
                  </button>

                  <button
                    onClick={() => handleGrantDays(inspectingUser.uid, 30, "monthly")}
                    className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold cursor-pointer"
                  >
                    +30d (Monthly)
                  </button>

                  <button
                    onClick={() => handleGrantDays(inspectingUser.uid, 365, "yearly")}
                    className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold cursor-pointer"
                  >
                    +1yr (Yearly)
                  </button>

                  <button
                    onClick={() => handleGrantLifetime(inspectingUser.uid)}
                    className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold cursor-pointer"
                  >
                    👑 VIP Lifetime
                  </button>

                  <button
                    onClick={() => handleRewardReferral(inspectingUser)}
                    className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Gift className="size-3.5" />
                    <span>+30d Referral</span>
                  </button>

                  <button
                    onClick={() => handleToggleSuspend(inspectingUser)}
                    className={cn(
                      "p-2.5 rounded-xl text-xs font-bold cursor-pointer",
                      inspectingUser.plan === "suspended"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {inspectingUser.plan === "suspended" ? "Unsuspend" : "Suspend"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL 2: EDIT USER PLAN ================= */}
        {editingUser && (
          <div
            className="fixed inset-0 z-[32000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setEditingUser(null)}
            style={{ touchAction: "none" }}
          >
            <form
              onSubmit={handleSaveUserPlan}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-primary/30 space-y-4 animate-in zoom-in-95 text-left"
              style={{ touchAction: "auto" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-foreground">Edit User Plan & Access</h3>
                  <p className="text-xs text-muted-foreground">{editingUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="size-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Plan Selector Chips */}
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Select Subscription Plan
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["trial", "monthly", "yearly", "lifetime_free", "suspended"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setEditPlanType(p);
                        if (p === "monthly") {
                          const d = new Date();
                          d.setDate(d.getDate() + 30);
                          setEditExpiryDate(d.toISOString().slice(0, 10));
                        } else if (p === "yearly") {
                          const d = new Date();
                          d.setDate(d.getDate() + 365);
                          setEditExpiryDate(d.toISOString().slice(0, 10));
                        } else if (p === "trial") {
                          const d = new Date();
                          d.setDate(d.getDate() + 30);
                          setEditExpiryDate(d.toISOString().slice(0, 10));
                        } else if (p === "lifetime_free") {
                          setEditExpiryDate("");
                        }
                      }}
                      className={cn(
                        "py-2 px-1 text-center rounded-xl text-xs font-bold border transition cursor-pointer capitalize",
                        editPlanType === p
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-secondary text-foreground border-transparent hover:bg-secondary/80",
                      )}
                    >
                      {p.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Extend Buttons */}
              {editPlanType !== "lifetime_free" && editPlanType !== "suspended" && (
                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Quick Expiry Set
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        setEditExpiryDate(d.toISOString().slice(0, 10));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-secondary text-xs font-bold text-foreground cursor-pointer hover:bg-secondary/80"
                    >
                      +30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 90);
                        setEditExpiryDate(d.toISOString().slice(0, 10));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-secondary text-xs font-bold text-foreground cursor-pointer hover:bg-secondary/80"
                    >
                      +90 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 365);
                        setEditExpiryDate(d.toISOString().slice(0, 10));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-secondary text-xs font-bold text-foreground cursor-pointer hover:bg-secondary/80"
                    >
                      +1 Year (365d)
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Date Input */}
              {editPlanType !== "lifetime_free" && (
                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Plan Expiry Date
                  </label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Admin Notes (Optional)
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Paid ₹1,999 via GPay on 29 Aug"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl saree-gradient text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= MODAL 3: CREATE COUPON ================= */}
        {createCouponOpen && (
          <div
            className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setCreateCouponOpen(false)}
            style={{ touchAction: "none" }}
          >
            <form
              onSubmit={handleCreateCouponSubmit}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-border/60 space-y-4 animate-in zoom-in-95"
              style={{ touchAction: "auto" }}
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

        {/* ================= MODAL 4: DELETE USER DIALOG ================= */}
        {pendingDeleteUser && (
          <div
            className="fixed inset-0 z-[32000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setPendingDeleteUser(null)}
            style={{ touchAction: "none" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-destructive/30 space-y-4 animate-in zoom-in-95 text-left"
              style={{ touchAction: "auto" }}
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center font-bold">
                  <Trash2 className="size-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-foreground">Remove User Account?</h3>
                  <p className="text-xs text-muted-foreground">{pendingDeleteUser.email}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This will delete the user's registration record from the system. (Their private local database will not be affected).
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingDeleteUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  className="flex-1 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
