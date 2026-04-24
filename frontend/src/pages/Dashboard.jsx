import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { FileText, ShieldCheck, Users, AlertTriangle, Link2, ArrowRight, Plus } from "lucide-react";

const StatCard = ({ label, value, icon: Icon, accent, testId }) => (
  <div data-testid={testId} className="bg-white border border-slate-200 rounded-sm p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-8 h-8 flex items-center justify-center rounded-sm ${accent}`}>
        <Icon size={16} strokeWidth={2} />
      </div>
      <div className="micro-label">{label}</div>
    </div>
    <div className="font-display font-black text-4xl tracking-tight">{value}</div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [firs, setFirs] = useState([]);

  useEffect(() => {
    api.get("/analytics/stats").then(({ data }) => setStats(data)).catch(() => {});
    api.get("/firs").then(({ data }) => setFirs(data.slice(0, 5))).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="micro-label mb-2">Operations Overview</div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight leading-none">
            {user.role === "citizen" ? "My Cases" : "Control Room"}
          </h1>
          <p className="text-sm text-slate-600 mt-2">Welcome back, {user.name}.</p>
        </div>
        <Link
          to="/firs/new"
          data-testid="btn-new-fir"
          className="bg-[#0033A0] text-white px-4 py-2.5 text-sm font-semibold rounded-sm hover:bg-[#002370] flex items-center gap-2 transition-colors"
        >
          <Plus size={16} /> File FIR
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard testId="stat-firs" label="Total FIRs" value={stats?.total_firs ?? "—"} icon={FileText} accent="bg-[#0033A0] text-white" />
        <StatCard testId="stat-open" label="Open Cases" value={stats?.open_cases ?? "—"} icon={AlertTriangle} accent="bg-[#FDB022] text-white" />
        <StatCard testId="stat-evidence" label="Evidence Items" value={stats?.total_evidence ?? "—"} icon={ShieldCheck} accent="bg-[#12B76A] text-white" />
        <StatCard testId="stat-suspects" label="Suspects" value={stats?.total_suspects ?? "—"} icon={Users} accent="bg-[#D92D20] text-white" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-display font-bold tracking-tight">Recent FIRs</h3>
            <Link to="/firs" className="text-xs font-semibold text-[#0033A0] flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-2.5 micro-label">FIR ID</th>
                <th className="text-left px-5 py-2.5 micro-label">Crime</th>
                <th className="text-left px-5 py-2.5 micro-label">Location</th>
                <th className="text-left px-5 py-2.5 micro-label">Status</th>
              </tr>
            </thead>
            <tbody data-testid="recent-firs">
              {firs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500 text-sm">
                    No FIRs yet. File a new one to begin.
                  </td>
                </tr>
              ) : (
                firs.map((f) => (
                  <tr key={f.fir_id} className="border-b border-slate-100 hover-row hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs">
                      <Link to={`/firs/${f.fir_id}`} className="text-[#0033A0] hover:underline">
                        {f.fir_id}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{f.crime_type}</td>
                    <td className="px-5 py-3">{f.location}</td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase bg-slate-100 border border-slate-200 rounded-sm">
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Link2 size={16} className="text-[#0033A0]" />
            <h3 className="font-display font-bold tracking-tight">Integrity Ledger</h3>
          </div>
          <div className="text-sm text-slate-600 mb-4">
            Every FIR, evidence upload and status change is chained via SHA-256 to prevent tampering.
          </div>
          <div className="border border-slate-200 rounded-sm p-3 font-mono text-[11px] bg-slate-50">
            <div className="text-slate-500">Tampered evidence:</div>
            <div className="font-display font-black text-2xl text-[#D92D20]">
              {stats?.tampered_evidence ?? 0}
            </div>
          </div>
          <Link
            to="/blockchain"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0]"
          >
            Open ledger <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
