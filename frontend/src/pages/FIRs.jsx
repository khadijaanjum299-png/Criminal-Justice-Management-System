import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Plus, Search } from "lucide-react";

export default function FIRs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [firs, setFirs] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    api.get("/firs").then(({ data }) => setFirs(data)).catch(() => {});
  }, []);
  const filtered = firs.filter((f) => {
    const query = q.trim().toLowerCase();
    if (!query) return true;
    return (
      (f.fir_id || "").toLowerCase().includes(query) ||
      (f.crime_type || "").toLowerCase().includes(query) ||
      (f.location || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="micro-label mb-2">Case Registry</div>
          <h1 className="font-display text-4xl font-black tracking-tight leading-none">FIRs</h1>
          <p className="text-sm text-slate-600 mt-2">{firs.length} total reports</p>
        </div>
        {user?.role === "citizen" && (
          <Link
            to="/firs/new"
            data-testid="btn-new-fir"
            className="bg-[#0033A0] text-white px-4 py-2.5 text-sm font-semibold rounded-sm hover:bg-[#002370] flex items-center gap-2"
          >
            <Plus size={16} /> New FIR
          </Link>
        )}
      </header>

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          data-testid="fir-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by ID, crime, location…"
          className="w-full border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-5 py-2.5 micro-label">FIR ID</th>
              <th className="text-left px-5 py-2.5 micro-label">Citizen</th>
              <th className="text-left px-5 py-2.5 micro-label">Crime Type</th>
              <th className="text-left px-5 py-2.5 micro-label">Location</th>
              <th className="text-left px-5 py-2.5 micro-label">Status</th>
              <th className="text-left px-5 py-2.5 micro-label">Filed</th>
            </tr>
          </thead>
          <tbody data-testid="fir-table">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500 text-sm">
                  No FIRs found.
                </td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr
                  key={f.fir_id}
                  className="border-b border-slate-100 hover-row hover-neon cursor-pointer"
                  onClick={() => navigate(`/firs/${f.fir_id}`)}
                >
                  <td className="px-5 py-3 font-mono text-xs">
                    <Link
                      to={`/firs/${f.fir_id}`}
                      data-testid={`fir-link-${f.fir_id}`}
                      className="text-[#0033A0] hover:underline"
                      onClick={(evt) => evt.stopPropagation()}
                    >
                      {f.fir_id}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{f.citizen_name}</td>
                  <td className="px-5 py-3">{f.crime_type}</td>
                  <td className="px-5 py-3 text-slate-600">{f.location}</td>
                  <td className="px-5 py-3">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase bg-slate-100 border border-slate-200 rounded-sm">
                      {f.display_status || (f.status?.toLowerCase() === "closed" ? "CASE CLOSED" : f.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 font-mono">
                    {f.created_at?.slice(0, 10)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
