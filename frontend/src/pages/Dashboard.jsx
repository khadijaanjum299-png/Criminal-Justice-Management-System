import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { FileText, ShieldCheck, Users, AlertTriangle, Link2, ArrowRight, Plus, Cpu, Scale, History, Upload, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const StatCard = ({ label, value, icon: Icon, accent, testId }) => (
  <div data-testid={testId} className="bg-card border border-border rounded-sm p-5">
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
  const [closedCases, setClosedCases] = useState([]);
  const [appealingCaseId, setAppealingCaseId] = useState("");
  const [appealReason, setAppealReason] = useState("");
  const [lawyerNotes, setLawyerNotes] = useState("");
  const [appealFiles, setAppealFiles] = useState([]);
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealHistory, setAppealHistory] = useState([]);
  
  // Citizen witness submission state
  const [witnessCaseId, setWitnessCaseId] = useState("");
  const [witnessObservation, setWitnessObservation] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [witnessContact, setWitnessContact] = useState("");
  const [witnessFiles, setWitnessFiles] = useState([]);
  const [witnessSubmitting, setWitnessSubmitting] = useState(false);
  const [showWitnessForm, setShowWitnessForm] = useState(false);

  useEffect(() => {
    const loadStats = () => api.get("/analytics/stats").then(({ data }) => setStats(data)).catch(() => {});
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

  const reloadCitizenClosedCases = () => {
    if (user?.role !== "citizen") return;
    api
      .get("/cases")
      .then(({ data }) => {
        const closed = (data || []).filter((c) => c.status === "Closed" && c.appeal_status !== "Pending");
        setClosedCases(closed);
      })
      .catch(() => {});
  };

  const reloadAppealHistory = () => {
    if (user?.role !== "citizen") return;
    api
      .get("/appeals")
      .then(({ data }) => setAppealHistory(data || []))
      .catch(() => setAppealHistory([]));
  };

  useEffect(() => {
    api.get("/firs").then(({ data }) => setFirs(data.slice(0, 5))).catch(() => {});

    if (user?.role === "citizen") {
      reloadCitizenClosedCases();
      reloadAppealHistory();
      const tick = () => {
        reloadCitizenClosedCases();
        reloadAppealHistory();
      };
      const t = setInterval(tick, 20000);
      const onVis = () => {
        if (document.visibilityState === "visible") tick();
      };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        clearInterval(t);
        document.removeEventListener("visibilitychange", onVis);
      };
    }
  }, [user?.role]);

  const submitWitnessObservation = async (e) => {
    e.preventDefault();
    if (!witnessCaseId || !witnessObservation.trim()) {
      toast.error("Please select a case and provide observation details");
      return;
    }
    setWitnessSubmitting(true);
    try {
      // First create the witness record
      const witnessData = {
        case_id: witnessCaseId,
        name: witnessName.trim() || "Anonymous Citizen",
        contact_info: witnessContact.trim() || "",
        statement: witnessObservation.trim(),
        is_protected: false,
        is_confidential: false,
      };
      const { data: witness } = await api.post("/witnesses", witnessData);
      
      // Then upload any files
      if (witnessFiles.length > 0) {
        for (const file of witnessFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("description", "Citizen witness observation document");
          await api.post(`/witnesses/${witness.witness_id}/documents`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }
      
      toast.success("Witness observation submitted successfully");
      setShowWitnessForm(false);
      setWitnessCaseId("");
      setWitnessObservation("");
      setWitnessName("");
      setWitnessContact("");
      setWitnessFiles([]);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setWitnessSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <div className="micro-label mb-2">Operations Overview</div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight leading-none">
            {user.role === "citizen" ? "My Cases" : "Control Room"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Welcome back, {user.name}.</p>
        </div>
        {user.role === "citizen" && (
          <Link
            to="/firs/new"
            data-testid="btn-new-fir"
            className="bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold rounded-sm hover:bg-primary/90 flex items-center gap-2 transition-colors"
          >
            <Plus size={16} /> File FIR
          </Link>
        )}
      </header>

      {user?.role === "citizen" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard testId="stat-firs" label="My FIRs" value={stats?.total_firs ?? "—"} icon={FileText} accent="bg-primary text-primary-foreground" />
          <StatCard testId="stat-open" label="Under Investigation" value={stats?.open_cases ?? "—"} icon={AlertTriangle} accent="bg-[#FDB022] text-white" />
          <StatCard testId="stat-closed" label="Case Closed" value={stats?.closed_cases ?? "—"} icon={CheckCircle2} accent="bg-[#12B76A] text-white" />
          <StatCard testId="stat-reopened" label="Reopened Cases" value={stats?.reopened_cases ?? "—"} icon={RotateCcw} accent="bg-amber-600 text-white" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard testId="stat-firs" label="Total FIRs" value={stats?.total_firs ?? "—"} icon={FileText} accent="bg-primary text-primary-foreground" />
          <StatCard testId="stat-open" label="Open Cases" value={stats?.open_cases ?? "—"} icon={AlertTriangle} accent="bg-[#FDB022] text-white" />
          <StatCard testId="stat-evidence" label="Evidence Items" value={stats?.total_evidence ?? "—"} icon={ShieldCheck} accent="bg-[#12B76A] text-white" />
          <StatCard testId="stat-suspects" label="Suspects" value={stats?.total_suspects ?? "—"} icon={Users} accent="bg-[#D92D20] text-white" />
          <StatCard testId="stat-appeals-pending" label="Appeals (pending)" value={stats?.pending_appeals ?? "—"} icon={Scale} accent="bg-amber-600 text-white" />
          <StatCard testId="stat-appeals-total" label="Appeals (total)" value={stats?.total_appeals ?? "—"} icon={Scale} accent="bg-slate-600 text-white" />
        </div>
      )}

      {user?.role !== "citizen" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard testId="stat-active-sentences" label="Active Sentences" value={stats?.active_sentences ?? "—"} icon={ShieldCheck} accent="bg-red-600 text-white" />
          <StatCard testId="stat-completed-sentences" label="Completed Sentences" value={stats?.completed_sentences ?? "—"} icon={CheckCircle2} accent="bg-green-600 text-white" />
          <StatCard testId="stat-released-prisoners" label="Released Prisoners" value={stats?.released_prisoners ?? "—"} icon={Users} accent="bg-blue-600 text-white" />
          <StatCard testId="stat-total-prisoners" label="Total Prisoners" value={((stats?.active_sentences ?? 0) + (stats?.completed_sentences ?? 0) + (stats?.released_prisoners ?? 0)) || "—"} icon={Users} accent="bg-slate-600 text-white" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-bold tracking-tight">Recent FIRs</h3>
            <Link to="/firs" className="text-xs font-semibold text-primary flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-5 py-2.5 micro-label">FIR ID</th>
                <th className="text-left px-5 py-2.5 micro-label">Crime</th>
                <th className="text-left px-5 py-2.5 micro-label">Location</th>
                <th className="text-left px-5 py-2.5 micro-label">Status</th>
              </tr>
            </thead>
            <tbody data-testid="recent-firs">
              {firs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground text-sm">
                    No FIRs yet. File a new one to begin.
                  </td>
                </tr>
              ) : (
                firs.map((f) => (
                  <tr key={f.fir_id} className="border-b border-border hover-row hover:bg-muted">
                    <td className="px-5 py-3 font-mono text-xs">
                      <Link to={`/firs/${f.fir_id}`} className="text-primary hover:underline">
                        {f.fir_id}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{f.crime_type}</td>
                    <td className="px-5 py-3">{f.location}</td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase bg-muted border border-border rounded-sm">
                        {f.display_status || (f.status?.toLowerCase() === "closed" ? "CASE CLOSED" : f.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-card border border-border rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Link2 size={16} className="text-primary" />
            <h3 className="font-display font-bold tracking-tight">Integrity Ledger</h3>
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            Every FIR, evidence upload and status change is chained via SHA-256 to prevent tampering.
          </div>
          <div className="border border-border rounded-sm p-3 font-mono text-[11px] bg-muted">
            <div className="text-muted-foreground">Tampered evidence:</div>
            <div className="font-display font-black text-2xl text-destructive">
              {stats?.tampered_evidence ?? 0}
            </div>
          </div>
          <Link
            to="/blockchain"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            Open ledger <ArrowRight size={12} />
          </Link>
        </div>
        {user?.role !== "citizen" && (
          <div className="bg-card border border-border rounded-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={16} className="text-primary" />
              <h3 className="font-display font-bold tracking-tight">AI Crime Predictor</h3>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Quickly assess area risk and predicted crime trends with a lightweight AI assistant.
            </div>
            <Link
              to="/ai-predictor"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              Open predictor <ArrowRight size={12} />
            </Link>
          </div>
        )}
        {['police', 'investigator', 'forensic', 'court_officer', 'judge', 'admin'].includes(user.role) && (
          <div className="bg-card border border-border rounded-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={16} className="text-primary" />
              <h3 className="font-display font-bold tracking-tight">Smart Contract</h3>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Validate evidence acceptance rules with simulated contract logic.
            </div>
            <Link
              to="/smart-contract"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              Open smart contract <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>

      {user?.role === "citizen" && closedCases.length > 0 && (
        <div className="rounded-xl border border-cyan-500/25 bg-gradient-to-br from-slate-900/90 via-slate-950 to-[#071018] shadow-[0_0_24px_rgba(34,211,238,0.08)] overflow-hidden">
          <div className="px-6 py-4 border-b border-cyan-500/15 bg-slate-900/50 flex items-center gap-3">
            <Scale size={20} className="text-cyan-400" />
            <div>
              <div className="micro-label text-cyan-400/90 tracking-widest">HIGHER COURT</div>
              <h3 className="font-display font-bold text-lg text-white tracking-tight">Appeal to Higher Court</h3>
              <p className="text-xs text-slate-500 mt-1">Available only after your case is closed. Supporting documents are hashed and logged on the integrity ledger.</p>
            </div>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {closedCases.map((c) => (
              <div key={c.case_id} className="p-5 hover:bg-[#0c1929]/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-cyan-300/90 mb-1">{c.case_id}</div>
                    <div className="font-semibold text-sm text-slate-100">{c.title || c.crime_type}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      FIR: <span className="font-mono text-slate-400">{c.fir_id}</span>
                      <span className="mx-2 text-slate-600">·</span>
                      Status: <span className="font-semibold text-slate-300">{c.status}</span>
                      {c.final_case_decision && (
                        <>
                          <span className="mx-2 text-slate-600">·</span>
                          Verdict: <span className="text-slate-300">{c.final_case_decision}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppealingCaseId(c.case_id);
                      setAppealReason("");
                      setLawyerNotes("");
                      setAppealFiles([]);
                    }}
                    className="shrink-0 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-4 py-2 text-xs font-semibold text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.12)] hover:bg-cyan-950/60 hover:border-cyan-400/50 transition-colors"
                  >
                    Appeal to Higher Court
                  </button>
                </div>

                {appealingCaseId === c.case_id && (
                  <div className="mt-4 rounded-xl border border-slate-700/80 bg-slate-950/70 p-4 space-y-4">
                    <div>
                      <label className="micro-label text-slate-400 block mb-1.5">Appeal reason (required)</label>
                      <textarea
                        value={appealReason}
                        onChange={(e) => setAppealReason(e.target.value)}
                        placeholder="Grounds for higher court review…"
                        rows={4}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      />
                    </div>
                    <div>
                      <label className="micro-label text-slate-400 block mb-1.5">Lawyer notes (optional)</label>
                      <textarea
                        value={lawyerNotes}
                        onChange={(e) => setLawyerNotes(e.target.value)}
                        placeholder="Counsel summary, citations, or procedural notes…"
                        rows={2}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      />
                    </div>
                    <div>
                      <label className="micro-label text-slate-400 flex items-center gap-2 mb-1.5">
                        <Upload size={12} className="text-cyan-500/80" /> Supporting documents (optional)
                      </label>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setAppealFiles(Array.from(e.target.files || []))}
                        className="text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-950 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-100"
                      />
                      {appealFiles.length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-1">{appealFiles.length} file(s) selected — each will be hashed for the blockchain record.</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!appealReason.trim()) {
                            toast.error("Please provide an appeal reason");
                            return;
                          }
                          setAppealSubmitting(true);
                          try {
                            const fd = new FormData();
                            fd.append("reason", appealReason.trim());
                            fd.append("lawyer_notes", lawyerNotes.trim());
                            appealFiles.forEach((f) => fd.append("files", f));
                            const { data } = await api.post(`/cases/${c.case_id}/appeal`, fd);
                            toast.success(`Appeal filed — ${data.appeal_id}. Ledger updated.`);
                            setAppealingCaseId("");
                            setAppealReason("");
                            setLawyerNotes("");
                            setAppealFiles([]);
                            const res = await api.get("/cases");
                            setClosedCases((res.data || []).filter((ca) => ca.status === "Closed" && ca.appeal_status !== "Pending"));
                            reloadAppealHistory();
                            const st = await api.get("/analytics/stats");
                            setStats(st.data);
                            api.get("/firs").then(({ data }) => setFirs(data.slice(0, 5))).catch(() => {});
                          } catch (e) {
                            toast.error(formatApiError(e.response?.data?.detail) || e.message);
                          } finally {
                            setAppealSubmitting(false);
                          }
                        }}
                        disabled={appealSubmitting}
                        className="rounded-lg border border-cyan-500/45 bg-cyan-600/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-50 transition-colors"
                      >
                        {appealSubmitting ? "Submitting…" : "Submit appeal"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAppealingCaseId("")}
                        className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {user?.role === "citizen" && appealHistory.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.05)]">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
            <History size={18} className="text-cyan-400/90" />
            <h3 className="font-display font-bold text-white tracking-tight">Appeal history</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="text-left px-5 py-2.5 micro-label text-slate-400">Appeal ID</th>
                  <th className="text-left px-5 py-2.5 micro-label text-slate-400">Case</th>
                  <th className="text-left px-5 py-2.5 micro-label text-slate-400">Status</th>
                  <th className="text-left px-5 py-2.5 micro-label text-slate-400">Filed</th>
                  <th className="text-left px-5 py-2.5 micro-label text-slate-400">Summary</th>
                </tr>
              </thead>
              <tbody>
                {appealHistory.map((a) => (
                  <tr key={a.id} className="border-b border-slate-800/80 hover:bg-[#0c1929]/70">
                    <td className="px-5 py-3 font-mono text-xs text-cyan-200/90">{a.appeal_id}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{a.case_id}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${
                          a.status === "Pending"
                            ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
                            : a.status === "Accepted"
                              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
                              : "bg-slate-600/30 text-slate-300 ring-slate-500/25"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 font-mono">{(a.requested_at || "").slice(0, 16).replace("T", " ")}</td>
                    <td className="px-5 py-3 text-xs text-slate-400 max-w-xs truncate" title={a.reason}>
                      {a.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {user?.role === "citizen" && (
        <div className="rounded-xl border border-cyan-500/25 bg-gradient-to-br from-slate-900/90 via-slate-950 to-[#071018] shadow-[0_0_24px_rgba(34,211,238,0.08)] overflow-hidden">
          <div className="px-6 py-4 border-b border-cyan-500/15 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Upload size={20} className="text-cyan-400" />
              <div>
                <div className="micro-label text-cyan-400/90 tracking-widest">CITIZEN WITNESS</div>
                <h3 className="font-display font-bold text-lg text-white tracking-tight">Submit Witness Observation</h3>
                <p className="text-xs text-slate-500 mt-1">Provide witness information and supporting documents for your cases. All uploads are hashed and logged on the integrity ledger.</p>
              </div>
            </div>
            <button
              onClick={() => setShowWitnessForm(!showWitnessForm)}
              className="shrink-0 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-4 py-2 text-xs font-semibold text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.12)] hover:bg-cyan-950/60 hover:border-cyan-400/50 transition-colors"
            >
              {showWitnessForm ? "Cancel" : "Submit Observation"}
            </button>
          </div>
          
          {showWitnessForm && (
            <div className="p-6">
              <form onSubmit={submitWitnessObservation} className="space-y-4">
                <div>
                  <label className="micro-label text-slate-400 block mb-1.5">Select Case *</label>
                  <select
                    value={witnessCaseId}
                    onChange={(e) => setWitnessCaseId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    required
                  >
                    <option value="">Select a case...</option>
                    {firs.map((f) => (
                      <option key={f.fir_id} value={f.fir_id}>
                        {f.fir_id} - {f.crime_type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="micro-label text-slate-400 block mb-1.5">Your Name (optional)</label>
                  <input
                    type="text"
                    value={witnessName}
                    onChange={(e) => setWitnessName(e.target.value)}
                    placeholder="Leave blank to submit anonymously"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
                <div>
                  <label className="micro-label text-slate-400 block mb-1.5">Contact Information (optional)</label>
                  <input
                    type="text"
                    value={witnessContact}
                    onChange={(e) => setWitnessContact(e.target.value)}
                    placeholder="Phone or email"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
                <div>
                  <label className="micro-label text-slate-400 block mb-1.5">Observation Details *</label>
                  <textarea
                    value={witnessObservation}
                    onChange={(e) => setWitnessObservation(e.target.value)}
                    placeholder="Describe what you observed..."
                    rows={4}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    required
                  />
                </div>
                <div>
                  <label className="micro-label text-slate-400 flex items-center gap-2 mb-1.5">
                    <Upload size={12} className="text-cyan-500/80" /> Supporting Documents (optional)
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setWitnessFiles(Array.from(e.target.files || []))}
                    className="text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-950 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-100"
                  />
                  {witnessFiles.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-1">{witnessFiles.length} file(s) selected — each will be hashed for the blockchain record.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={witnessSubmitting}
                    className="rounded-lg border border-cyan-500/45 bg-cyan-600/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-50 transition-colors"
                  >
                    {witnessSubmitting ? "Submitting..." : "Submit Observation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWitnessForm(false)}
                    className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
