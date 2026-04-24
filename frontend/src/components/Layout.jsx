import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  Users as UsersIcon,
  Fingerprint,
  ShieldCheck,
  Activity,
  Gavel,
  BarChart3,
  Link2,
  LogOut,
  UserCog,
} from "lucide-react";

const allNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["citizen", "police", "forensic", "admin"] },
  { to: "/firs", label: "FIRs", icon: FileText, roles: ["citizen", "police", "forensic", "admin"] },
  { to: "/evidence", label: "Evidence", icon: ShieldCheck, roles: ["citizen", "police", "forensic", "admin"] },
  { to: "/suspects", label: "Suspects", icon: UsersIcon, roles: ["police", "forensic", "admin"] },
  { to: "/forensic", label: "Forensic", icon: Fingerprint, roles: ["police", "forensic", "admin"] },
  { to: "/blockchain", label: "Blockchain", icon: Link2, roles: ["citizen", "police", "forensic", "admin"] },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["citizen", "police", "forensic", "admin"] },
  { to: "/activity", label: "Activity Logs", icon: Activity, roles: ["police", "admin"] },
  { to: "/users", label: "User Management", icon: UserCog, roles: ["admin"] },
];

const roleLabel = {
  citizen: "Citizen",
  police: "Police Officer",
  forensic: "Forensic Expert",
  admin: "Administrator",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = allNav.filter((n) => n.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-white">
      {/* Sidebar */}
      <aside className="border-r border-slate-200 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#0033A0] text-white flex items-center justify-center font-display font-black text-sm rounded-sm">
              <Gavel size={18} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-black text-base leading-tight tracking-tight">CJS</div>
              <div className="micro-label mt-0.5">Case Management</div>
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
                  `flex items-center gap-3 px-6 py-2.5 text-sm font-medium border-l-2 ${
                    isActive
                      ? "border-l-[#0033A0] bg-slate-50 text-[#0033A0]"
                      : "border-l-transparent text-slate-700 hover:bg-slate-50 hover:text-[#0033A0]"
                  } transition-colors`
                }
              >
                <Icon size={16} strokeWidth={2} />
                {n.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Signed in as</div>
          <div className="text-sm font-semibold truncate" data-testid="user-name">
            {user.name}
          </div>
          <div className="text-xs text-slate-500 truncate">{user.email}</div>
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#0033A0] text-white rounded-sm">
              {roleLabel[user.role] || user.role}
            </span>
            <button
              data-testid="logout-btn"
              onClick={handleLogout}
              className="text-xs text-slate-600 hover:text-[#D92D20] flex items-center gap-1 transition-colors"
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
