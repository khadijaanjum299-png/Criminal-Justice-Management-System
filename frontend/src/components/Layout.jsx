import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  FileText,
  Users as UsersIcon,
  Fingerprint,
  ShieldCheck,
  Activity,
  Gavel,
  ClipboardList,
  SearchCheck,
  Scale,
  Landmark,
  BarChart3,
  Link2,
  LogOut,
  UserCog,
  ShieldAlert,
  Settings,
  Cpu,
  Bell,
} from "lucide-react";

const allNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["citizen", "police", "investigator", "forensic", "court_officer", "judge", "admin"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["citizen", "police", "investigator", "forensic", "court_officer", "judge", "admin"] },
  { to: "/firs", label: "FIRs", icon: FileText, roles: ["citizen", "police", "judge", "admin"] },
  { to: "/cases", label: "Cases", icon: ClipboardList, roles: ["citizen", "police"] },
  { to: "/investigator", label: "Investigator", icon: SearchCheck, roles: ["investigator"] },
  { to: "/suspects", label: "Suspects", icon: UsersIcon, roles: ["police", "investigator", "forensic", "court_officer", "judge"] },
  { to: "/evidence", label: "Evidence Review", icon: ShieldCheck, roles: ["judge", "court_officer"] },
  { to: "/forensic", label: "Forensic", icon: Fingerprint, roles: ["forensic", "police", "judge"] },
  { to: "/court", label: "Court", icon: Landmark, roles: ["court_officer"] },
  { to: "/judge", label: "Verdicts", icon: Scale, roles: ["judge"] },
  { to: "/blockchain", label: "Blockchain", icon: Link2, roles: ["citizen", "police", "investigator", "forensic", "court_officer", "judge", "admin"] },
  { to: "/ai-predictor", label: "AI Predictor", icon: Cpu, roles: ["citizen", "police", "investigator", "forensic", "court_officer", "judge", "admin"] },
  { to: "/smart-contract", label: "Smart Contract", icon: Cpu, roles: ["police", "investigator", "forensic", "court_officer", "judge"] },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["citizen", "police", "investigator", "forensic", "court_officer", "admin", "judge"] },
  { to: "/activity", label: "Activity Logs", icon: Activity, roles: ["admin", "judge"] },
  { to: "/users", label: "User Management", icon: UserCog, roles: ["admin"] },
  { to: "/fraud", label: "Fraud Detection", icon: ShieldAlert, roles: ["admin"] },
  { to: "/admin", label: "Admin Audit", icon: Settings, roles: ["admin"] },
];

const roleLabel = {
  citizen: "Citizen",
  police: "Police Officer",
  forensic: "Forensic Expert",
  investigator: "Investigator",
  court_officer: "Court Officer",
  judge: "Judge",
  admin: "Administrator",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = allNav.filter((n) => n.roles.includes(user.role));
  const [walletId, setWalletId] = useState("");
  const [ipfsStatus, setIpfsStatus] = useState({ connected: false, status: "Unknown" });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    api
      .get("/user/wallet")
      .then(({ data }) => setWalletId(data?.wallet_id || ""))
      .catch(() => setWalletId(""));
  }, []);

  useEffect(() => {
    const checkIpfs = async () => {
      try {
        const { data } = await api.get("/ipfs/status");
        setIpfsStatus(data);
      } catch (_) {
        setIpfsStatus((s) => ({ ...s, connected: false, status: "Offline" }));
      }
    };
    checkIpfs();
    const interval = setInterval(checkIpfs, 30000);
    return () => clearInterval(interval);
  }, []);

  const copyWalletId = async () => {
    if (!walletId) return;
    try {
      await navigator.clipboard.writeText(walletId);
    } catch (_) {
      // Keep UI minimal: no extra notification
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-background">
      {/* Sidebar */}
      <aside className="border-r border-slate-800 bg-slate-950 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary text-primary-foreground flex items-center justify-center font-display font-black text-sm rounded-sm">
              <Gavel size={18} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-black text-base leading-tight tracking-tight text-white">CJS</div>
              <div className="micro-label mt-0.5 text-slate-500">Case Management</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 scroll-slim overflow-y-auto">
          {nav.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={`nav-${n.to.replace("/", "")}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-2.5 text-sm font-medium border-l-2 transition-colors ${
                    isActive
                      ? "border-l-cyan-400 bg-[#0c1929] text-cyan-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.2)]"
                      : "border-l-transparent text-slate-400 hover:bg-[#0c1929] hover:text-cyan-100 hover:border-l-cyan-500/35"
                  }`
                }
              >
                <Icon size={16} strokeWidth={2} />
                {n.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4 bg-slate-950/90">
          <div className="text-xs text-slate-500 mb-1">Signed in as</div>
          <div className="text-sm font-semibold truncate text-slate-100" data-testid="user-name">
            {user.name}
          </div>
          <div className="text-xs text-slate-500 truncate">{user.email}</div>
          <div className="mt-3">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Wallet ID</div>
            <div className="mt-1 px-2 py-1 border border-cyan-500/30 bg-slate-900/50 rounded-sm font-mono text-[10px] text-slate-400 break-all">
              {walletId || "Not available"}
            </div>
            <button
              onClick={copyWalletId}
              disabled={!walletId}
              className="mt-1 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 disabled:text-muted-foreground transition-colors"
            >
              Copy Wallet ID
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-primary text-primary-foreground rounded-sm">
              {roleLabel[user.role] || user.role}
            </span>
            <button
              data-testid="logout-btn"
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-cyan-200 flex items-center gap-1 transition-colors"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="overflow-y-auto">
        <div className="px-8 py-6 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
