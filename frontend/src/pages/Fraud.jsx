import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";

function riskBadgeClass(risk) {
  if (risk === "High Risk") return "bg-[#D92D20] text-white";
  if (risk === "Suspicious") return "bg-[#FDB022] text-white";
  return "bg-[#12B76A] text-white";
}

export default function Fraud() {
  const [users, setUsers] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: all }, { data: flagged }] = await Promise.all([
        api.get("/fraud/all-users"),
        api.get("/fraud/flags"),
      ]);
      setUsers(all.users || []);
      setFlags(flagged.flags || []);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2">Fraud Detection Module</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">Trust Scoring Dashboard</h1>
        <p className="text-sm text-slate-600 mt-2">
          Rule-based trust score monitoring for officers, investigators, forensic experts, and judges.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Tracked Users</div>
          <div className="font-display font-black text-4xl mt-2">{users.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Flagged Users</div>
          <div className="font-display font-black text-4xl mt-2 text-[#FDB022]">{flags.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">High Risk</div>
          <div className="font-display font-black text-4xl mt-2 text-[#D92D20]">
            {flags.filter((f) => f.risk_level === "High Risk").length}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 font-display font-bold">User Trust Scores</div>
        {loading ? (
          <div className="px-5 py-6 text-sm text-slate-500">Loading trust scores...</div>
        ) : users.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">No tracked users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-2.5 micro-label">Name</th>
                <th className="text-left px-5 py-2.5 micro-label">Role</th>
                <th className="text-left px-5 py-2.5 micro-label">Trust Score</th>
                <th className="text-left px-5 py-2.5 micro-label">Risk</th>
                <th className="text-left px-5 py-2.5 micro-label">Action</th>
                <th className="text-left px-5 py-2.5 micro-label">Reason</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b border-slate-100">
                  <td className="px-5 py-3">
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-5 py-3">{u.role}</td>
                  <td className="px-5 py-3 font-semibold">{u.trust_score}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase rounded-sm ${riskBadgeClass(u.risk_level)}`}>
                      {u.risk_level}
                    </span>
                  </td>
                  <td className="px-5 py-3">{u.action}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">
                    {(u.reasons && u.reasons.length > 0) ? u.reasons[0] : "No major indicators"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
