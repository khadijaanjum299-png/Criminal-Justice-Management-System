import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { CheckCircle2, Clock } from "lucide-react";

const CASE_STATUSES = [
  "FIR Registered",
  "Approved",
  "Under Investigation",
  "Evidence Collected",
  "Forensic Review",
  "Sent to Forensic Review",
  "Forensic Review Completed",
  "Sent to Court",
  "Hearing Scheduled",
  "Judgment Issued",
  "Closed",
];

const CASE_PHASES = [
  "FIR Registered",
  "Under Investigation",
  "Forensic Review",
  "Sent to Court",
  "Judgment Issued",
  "Closed",
];

export default function Cases() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [loading, setLoading] = useState(true);

  const [firId, setFirId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [newStatus, setNewStatus] = useState("Approved");
  const [statusNote, setStatusNote] = useState("");
  const [overviewStats, setOverviewStats] = useState(null);
  const [appealReason, setAppealReason] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const canManage = user.role === "police";

  const loadCases = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/cases");
      setCases(data);
      if (data.length > 0) {
        setSelectedCaseId((prev) => prev || data[0].case_id);
      } else {
        setSelectedCaseId("");
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    const loadStats = () => api.get("/analytics/stats").then(({ data }) => setOverviewStats(data)).catch(() => {});
    loadStats();
    const t = setInterval(loadStats, 20000);
    const onVis = () => {
      if (document.visibilityState === "visible") loadStats();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      loadCases();
    }, 20000);
    const onVis = () => {
      if (document.visibilityState === "visible") loadCases();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    setAppealReason("");
  }, [selectedCaseId]);

  useEffect(() => {
    if (user.role !== "admin") return;
    api
      .get("/users")
      .then(({ data }) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, [user.role]);

  const selectedCase = useMemo(
    () => cases.find((c) => c.case_id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  // Keep the status dropdown in sync with the currently selected case.
  useEffect(() => {
    if (selectedCase?.status) setNewStatus(selectedCase.status);
    setStatusNote("");
  }, [selectedCaseId]);  

  const selectedPhaseIndex = useMemo(() => {
    if (!selectedCase?.status) return -1;
    const idx = CASE_PHASES.findIndex((phase) => selectedCase.status === phase);
    if (idx >= 0) return idx;
    // map related statuses to nearest milestone phase
    if (["Approved", "Evidence Collected"].includes(selectedCase.status)) return 1;
    if (["Sent to Forensic Review", "Forensic Review Completed"].includes(selectedCase.status)) return 2;
    if (["Hearing Scheduled"].includes(selectedCase.status)) return 3;
    return -1;
  }, [selectedCase]);

  const createCase = async (e) => {
    e.preventDefault();
    try {
      await api.post("/cases", { fir_id: firId.trim(), title: title.trim(), summary: summary.trim() });
      toast.success("Case created successfully");
      setFirId("");
      setTitle("");
      setSummary("");
      await loadCases();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const updateStatus = async () => {
    if (!selectedCase) return;
    try {
      await api.patch(`/cases/${selectedCase.case_id}/status`, {
        status: newStatus,
        forwarded_to: undefined,
        remarks: statusNote.trim(),
      });
      toast.success(`Case status updated to ${newStatus}`);
      setStatusNote("");
      await loadCases();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const assignedUsers = useMemo(() => {
    if (!selectedCase) return [];
    const rows = [];
    if (selectedCase.assigned_investigator_id || selectedCase.assigned_investigator_email || selectedCase.assigned_investigator_name) {
      const inv =
        users.find((u) => u.id === selectedCase.assigned_investigator_id) ||
        users.find((u) => u.email === selectedCase.assigned_investigator_email);
      rows.push({
        role: "investigator",
        name: selectedCase.assigned_investigator_name || inv?.name || "Unknown",
        email: selectedCase.assigned_investigator_email || inv?.email || "—",
        trustScore: inv?.trust_score,
      });
    }
    if (selectedCase.assigned_users && typeof selectedCase.assigned_users === "object") {
      Object.entries(selectedCase.assigned_users).forEach(([role, person]) => {
        if (!person || typeof person !== "object") return;
        const matched =
          users.find((u) => u.id === person.id || u.id === person.user_id) ||
          users.find((u) => u.email === person.email);
        if (role === "investigator" && rows.length > 0) return;
        rows.push({
          role,
          name: person.name || matched?.name || "Unknown",
          email: person.email || matched?.email || "—",
          trustScore: person.trust_score ?? matched?.trust_score,
        });
      });
    }
    return rows;
  }, [selectedCase, users]);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2">Case Tracking</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">Cases</h1>
        <p className="text-sm text-slate-600 mt-2">
          Track each criminal case from FIR registration to closure.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Total FIRs", value: overviewStats?.total_firs },
          { label: "Open cases", value: overviewStats?.open_cases },
          { label: "Evidence", value: overviewStats?.total_evidence },
          { label: "Suspects", value: overviewStats?.total_suspects },
          { label: "Appeals (pending)", value: overviewStats?.pending_appeals },
          { label: "Appeals (total)", value: overviewStats?.total_appeals },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-sm p-4">
            <div className="micro-label text-[10px]">{s.label}</div>
            <div className="font-display font-black text-2xl tracking-tight mt-1">{s.value ?? "—"}</div>
          </div>
        ))}
      </div>

      {canManage && (
        <form onSubmit={createCase} className="bg-white border border-slate-200 rounded-sm p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={firId}
            onChange={(e) => setFirId(e.target.value)}
            required
            placeholder="FIR ID (e.g., FIR-20260425-ABC123)"
            className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Case title (optional)"
            className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
          />
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Case summary (optional)"
            className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
          />
          <button
            type="submit"
            className="bg-[#0033A0] text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-[#002370]"
          >
            Create Case
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 micro-label">All Cases</div>
          {loading ? (
            <div className="px-4 py-6 text-sm text-slate-500">Loading cases...</div>
          ) : cases.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">No cases found.</div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              {cases.map((c) => (
                <button
                  key={c.case_id}
                  onClick={() => setSelectedCaseId(c.case_id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover-neon ${
                    selectedCaseId === c.case_id ? "bg-slate-50" : ""
                  }`}
                >
                  <div className="text-xs font-mono text-[#0033A0]">{c.case_id}</div>
                  <div className="text-sm font-semibold mt-1">{c.title || c.crime_type || "Untitled Case"}</div>
                  <div className="text-xs text-slate-500 mt-1">{c.status}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm p-6">
          {!selectedCase ? (
            <div className="text-sm text-slate-500">Select a case to view details and timeline.</div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="micro-label font-mono">{selectedCase.case_id}</div>
                <h2 className="font-display text-2xl font-black tracking-tight mt-1">
                  {selectedCase.title || selectedCase.crime_type}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  FIR: {selectedCase.fir_id} · Citizen: {selectedCase.citizen_name}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="micro-label">Current Status</div>
                  <div className="mt-1 inline-block px-2 py-1 text-xs font-semibold uppercase bg-[#0033A0] text-white rounded-sm">
                    {selectedCase.status}
                  </div>
                </div>
                <div>
                  <div className="micro-label">Created</div>
                  <div className="text-sm mt-1">{selectedCase.created_at?.slice(0, 10)}</div>
                </div>
                <div>
                  <div className="micro-label">Assigned Investigator</div>
                  <div className="text-sm mt-1">{selectedCase.assigned_investigator_name || "— unassigned —"}</div>
                </div>
                <div>
                  <div className="micro-label">Court Hearing Date</div>
                  <div className="text-sm mt-1">{selectedCase.court_info?.hearing_date || "Not Scheduled Yet"}</div>
                </div>
                <div>
                  <div className="micro-label">Hearing Status</div>
                  <div className="text-sm mt-1">{selectedCase.court_info?.hearing_status || "Not Started"}</div>
                </div>
                <div>
                  <div className="micro-label">Judge Verdict</div>
                  <div className="text-sm mt-1">{selectedCase.judge_info?.verdict || "Pending"}</div>
                </div>
                <div>
                  <div className="micro-label">Final Case Decision</div>
                  <div className="text-sm mt-1">{selectedCase.final_case_decision || "Pending"}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="micro-label">Current Assigned Users</div>
                {assignedUsers.length === 0 ? (
                  <div className="text-sm text-slate-500">No assigned users available.</div>
                ) : (
                  <div className="space-y-1">
                    {assignedUsers.map((entry, idx) => (
                      <div key={`${entry.role}-${idx}`} className="text-sm text-slate-700">
                        {entry.role}: {entry.name} ({entry.email}){" "}
                        {entry.trustScore != null ? `· Trust Score: ${entry.trustScore}` : "· Trust Score: N/A"}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {user.role === "citizen" && selectedCase.appeal_status === "Pending" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm text-sm text-amber-900">
                  An appeal you filed for this case is pending review.
                </div>
              )}

              {user.role === "citizen" &&
                ["Closed", "Judgment Issued", "Rejected"].includes(selectedCase.status) &&
                selectedCase.appeal_status !== "Pending" && (
                  <div className="p-4 border border-amber-300 bg-amber-50 rounded-sm space-y-3">
                    <div className="font-display font-bold text-amber-900">Higher court appeal</div>
                    <textarea
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      rows={3}
                      placeholder="Reason for appeal…"
                      className="w-full border border-amber-200 bg-white px-3 py-2 text-sm rounded-sm"
                    />
                    <button
                      type="button"
                      disabled={appealSubmitting}
                      onClick={async () => {
                        if (!appealReason.trim()) {
                          toast.error("Please enter a reason for your appeal.");
                          return;
                        }
                        setAppealSubmitting(true);
                        try {
                          const { data } = await api.post(`/cases/${selectedCase.case_id}/appeal`, {
                            reason: appealReason.trim(),
                          });
                          toast.success(`Appeal filed (${data.appeal_id})`);
                          setAppealReason("");
                          await loadCases();
                          const st = await api.get("/analytics/stats");
                          setOverviewStats(st.data);
                        } catch (e) {
                          toast.error(formatApiError(e.response?.data?.detail) || e.message);
                        } finally {
                          setAppealSubmitting(false);
                        }
                      }}
                      className="bg-amber-600 text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-amber-700 disabled:opacity-50"
                    >
                      {appealSubmitting ? "Submitting…" : "Submit appeal"}
                    </button>
                  </div>
                )}

              <div className="pt-4 border-t border-slate-200">
                <div className="font-display font-bold mb-3">Case Progress</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {CASE_PHASES.map((phase, index) => (
                    <div
                      key={phase}
                      className={`text-xs px-2 py-2 border rounded-sm ${
                        selectedPhaseIndex >= index
                          ? "bg-[#0033A0] text-white border-[#0033A0]"
                          : "bg-white text-slate-600 border-slate-300"
                      }`}
                    >
                      {phase}
                    </div>
                  ))}
                </div>
              </div>

              {canManage && (
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="micro-label">Update Case Status</div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                    >
                      {CASE_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <input
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Note (optional)"
                      className="flex-1 border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                    />
                    <button
                      onClick={updateStatus}
                      className="bg-[#0033A0] text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-[#002370]"
                    >
                      Update
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200">
                <div className="font-display font-bold mb-4">Full Case Timeline</div>
                <div className="space-y-4">
                  {(selectedCase.full_timeline || selectedCase.status_history || []).map((h, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 flex-shrink-0 bg-[#0033A0] text-white flex items-center justify-center rounded-sm">
                        {i === 0 ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{h.status || h.type || "Update"}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {h.at?.slice(0, 19).replace("T", " ")}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">by {h.by || h.created_by || h.issued_by || "system"}</div>
                        {h.note && <div className="text-xs text-slate-700 mt-1 italic">"{h.note}"</div>}
                        {h.hearing_status && <div className="text-xs text-slate-700 mt-1">Hearing: {h.hearing_status}</div>}
                        {h.verdict && <div className="text-xs text-slate-700 mt-1">Verdict: {h.verdict}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
