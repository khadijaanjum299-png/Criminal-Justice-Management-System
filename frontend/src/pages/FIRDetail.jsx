import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";

const STATUSES = [
  "Approved", "Under Investigation", "Evidence Collected",
  "Forensic Review", "Sent to Court", "Hearing Scheduled",
  "Judgment Issued", "Closed", "Rejected",
];

export default function FIRDetail() {
  const { firId } = useParams();
  const { user } = useAuth();
  const [fir, setFir] = useState(null);
  const [newStatus, setNewStatus] = useState("Approved");
  const [note, setNote] = useState("");

  const load = () =>
    api.get(`/firs/${firId}`).then(({ data }) => setFir(data)).catch(() => {});

  useEffect(() => {
    load();
  }, [firId]);

  const updateStatus = async () => {
    try {
      await api.patch(`/firs/${firId}/status`, { status: newStatus, note });
      toast.success(`Status updated → ${newStatus}`);
      setNote("");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  if (!fir) return <div className="micro-label">Loading…</div>;

  const canManage = ["police", "forensic", "admin"].includes(user.role);

  return (
    <div className="space-y-6">
      <Link to="/firs" className="text-sm text-slate-600 hover:text-[#0033A0] inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Back to FIRs
      </Link>

      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2 font-mono">{fir.fir_id}</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">
          {fir.crime_type}
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Filed by {fir.citizen_name} · {fir.location} · {fir.created_at?.slice(0, 10)}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm p-6 space-y-4">
          <div>
            <div className="micro-label">Description</div>
            <div className="text-sm mt-2 leading-relaxed whitespace-pre-wrap">{fir.description}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div>
              <div className="micro-label">Current Status</div>
              <div className="mt-1 inline-block px-2 py-1 text-xs font-semibold uppercase bg-[#0033A0] text-white rounded-sm">
                {fir.status}
              </div>
            </div>
            <div>
              <div className="micro-label">Assigned Officer</div>
              <div className="text-sm mt-1">{fir.assigned_officer_name || "— unassigned —"}</div>
            </div>
          </div>

          {canManage && (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="micro-label">Update Status</div>
              <div className="flex gap-2">
                <select
                  data-testid="fir-status-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="flex-1 border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <input
                  data-testid="fir-status-note"
                  placeholder="Note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex-1 border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                />
                <button
                  data-testid="fir-status-update"
                  onClick={updateStatus}
                  className="bg-[#0033A0] text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-[#002370]"
                >
                  Update
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-6">
          <div className="font-display font-bold mb-4">Timeline</div>
          <div className="space-y-4">
            {(fir.status_history || []).map((h, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 flex-shrink-0 bg-[#0033A0] text-white flex items-center justify-center rounded-sm">
                  {i === fir.status_history.length - 1 ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                </div>
                <div>
                  <div className="text-sm font-semibold">{h.status}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{h.at?.slice(0, 19).replace("T", " ")}</div>
                  <div className="text-xs text-slate-600 mt-1">by {h.by}</div>
                  {h.note && <div className="text-xs text-slate-700 mt-1 italic">"{h.note}"</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
