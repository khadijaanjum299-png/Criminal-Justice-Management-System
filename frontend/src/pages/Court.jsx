import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Scale, Check, X, Fingerprint, Users, Download, ShieldCheck } from "lucide-react";

const HEARING_STATUSES = ["Scheduled", "In Progress", "Completed"];

function getFlowStatus(caseDoc) {
  const status = caseDoc?.status || "";
  const hearing = caseDoc?.hearing_status || "";
  if (["FIR Registered", "Approved", "Rejected"].includes(status)) return "FIR Filed";
  if (["Under Investigation", "Evidence Collected"].includes(status)) return "Under Investigation";
  if (["Forensic Review", "Sent to Forensic Review", "Forensic Review Completed"].includes(status)) return "Forensic Review";
  if (status === "Sent to Court") return "Ready for Court";
  if (status === "REOPENED") return "Reopened (Higher Court)";
  if (status === "Hearing Scheduled" || hearing) return "In Court";
  if (["Judgment Issued", "Closed"].includes(status)) return "In Court";
  return "FIR Filed";
}

export default function Court() {
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [evidence, setEvidence] = useState([]);
  const [witnesses, setWitnesses] = useState([]);
  const [verifyResult, setVerifyResult] = useState({});
  const [hearingDate, setHearingDate] = useState("");
  const [scheduleNote, setScheduleNote] = useState("");
  const [hearingStatus, setHearingStatus] = useState("Scheduled");
  const [statusNote, setStatusNote] = useState("");
  const [manualHashInput, setManualHashInput] = useState("");
  const [cidVerifyInput, setCidVerifyInput] = useState("");
  const [manualVerifyResult, setManualVerifyResult] = useState(null);
  const [cidVerifyResult, setCidVerifyResult] = useState(null);

  const [appeals, setAppeals] = useState([]);
  const [appealSubmitting, setAppealSubmitting] = useState({});
  const [appealNote, setAppealNote] = useState({});
  const [overviewStats, setOverviewStats] = useState(null);

  const loadEvidence = async (caseId) => {
    if (!caseId) {
      setEvidence([]);
      return;
    }
    try {
      const { data } = await api.get("/evidence", { params: { case_id: caseId } });
      setEvidence(data || []);
    } catch {
      setEvidence([]);
    }
  };

  const loadWitnesses = async (caseId) => {
    if (!caseId) {
      setWitnesses([]);
      return;
    }
    try {
      const { data } = await api.get("/witnesses", { params: { case_id: caseId } });
      setWitnesses(data?.witnesses || []);
    } catch {
      setWitnesses([]);
    }
  };

  const loadCases = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/court/cases");
      setCases(data || []);
      if ((data || []).length > 0) {
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

  const loadAppeals = async () => {
    try {
      const { data } = await api.get("/appeals");
      setAppeals(data || []);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const decideAppeal = async (caseId, decision) => {
    setAppealSubmitting((prev) => ({ ...prev, [caseId]: true }));
    try {
      await api.post(`/cases/${caseId}/appeal/decision`, {
        decision,
        note: appealNote[caseId] || "",
      });
      toast.success(`Appeal ${decision === "accept" ? "accepted — case status REOPENED" : "rejected — case remains CLOSED"}`);
      setAppealNote((prev) => ({ ...prev, [caseId]: "" }));
      await loadAppeals();
      await loadCases();
      const { data } = await api.get("/analytics/stats");
      setOverviewStats(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setAppealSubmitting((prev) => ({ ...prev, [caseId]: false }));
    }
  };

  const refreshOverview = () => {
    api.get("/analytics/stats").then(({ data }) => setOverviewStats(data)).catch(() => {});
  };

  useEffect(() => {
    loadCases();
    loadAppeals();
    refreshOverview();
    const t = setInterval(() => {
      refreshOverview();
      loadAppeals();
      loadCases();
    }, 20000);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        refreshOverview();
        loadAppeals();
        loadCases();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (selectedCaseId) {
      loadEvidence(selectedCaseId);
      loadWitnesses(selectedCaseId);
    }
  }, [selectedCaseId]);

  const selected = useMemo(
    () => cases.find((c) => c.case_id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  const pendingAppeals = useMemo(() => (appeals || []).filter((a) => a.status === "Pending"), [appeals]);
  const decidedAppeals = useMemo(() => (appeals || []).filter((a) => a.status !== "Pending"), [appeals]);

  const verifyAppealDocHash = async (hash) => {
    if (!hash) return;
    try {
      const { data } = await api.post("/verify/hash", { hash });
      toast[data.verified ? "success" : "error"](data.message || "Hash check complete");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const verifyAppealDocCid = async (cid) => {
    if (!cid) return;
    try {
      const { data } = await api.post("/verify/cid", { cid });
      toast[data.verified ? "success" : "error"](data.message || "CID check complete");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const approvalSummary = useMemo(() => {
    const total = evidence.length;
    const approved = evidence.filter((ev) => (ev.approvals?.length || 0) >= 2).length;
    const pending = total - approved;
    return { total, approved, pending };
  }, [evidence]);

  const verifyEvidence = async (evidenceId) => {
    if (!evidenceId) return;
    try {
      const { data } = await api.get(`/evidence/${evidenceId}/verify`);
      setVerifyResult((prev) => ({ ...prev, [evidenceId]: data }));
      if (data.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      await loadEvidence(selectedCaseId);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const verifyHashManual = async () => {
    if (!manualHashInput.trim()) {
      toast.error("Enter a hash to verify.");
      return;
    }
    try {
      const { data } = await api.post("/verify/hash", { hash: manualHashInput.trim() });
      setManualVerifyResult(data);
      toast[data.verified ? "success" : "error"](data.message || "Hash verification completed");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const verifyCidManual = async () => {
    if (!cidVerifyInput.trim()) {
      toast.error("Enter a CID to verify.");
      return;
    }
    try {
      const { data } = await api.post("/verify/cid", { cid: cidVerifyInput.trim() });
      setCidVerifyResult(data);
      toast[data.verified ? "success" : "error"](data.message || "CID verification completed");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const forwardToJudge = async () => {
    if (!selected) return;
    try {
      await api.post("/court/update-status", {
        case_id: selected.case_id,
        hearing_status: "Completed",
        note: "Forwarded to judge",
      });
      toast.success("Case forwarded to Judge");
      await loadCases();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const scheduleHearing = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await api.post("/court/schedule-hearing", {
        case_id: selected.case_id,
        hearing_date: hearingDate,
        note: scheduleNote.trim(),
      });
      toast.success("Hearing scheduled");
      setScheduleNote("");
      await loadCases();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const updateHearingStatus = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await api.post("/court/update-status", {
        case_id: selected.case_id,
        hearing_status: hearingStatus,
        note: statusNote.trim(),
      });
      toast.success("Hearing status updated");
      setStatusNote("");
      await loadCases();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2">Court Module</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">Court Dashboard</h1>
        <p className="text-sm text-slate-600 mt-2">View forensic-forwarded cases and manage hearings.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total FIRs", value: overviewStats?.total_firs },
          { label: "Open cases", value: overviewStats?.open_cases },
          { label: "Evidence", value: overviewStats?.total_evidence },
          { label: "Reopened cases", value: overviewStats?.reopened_cases },
          { label: "Appeals (pending)", value: overviewStats?.pending_appeals },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-sm p-4">
            <div className="micro-label text-[10px]">{s.label}</div>
            <div className="font-display font-black text-2xl tracking-tight mt-1">{s.value ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 micro-label">Court Cases</div>
          {loading ? (
            <div className="px-4 py-6 text-sm text-slate-500">Loading...</div>
          ) : cases.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">No cases available.</div>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              {cases.map((c) => (
                <button
                  key={c.case_id}
                  onClick={() => setSelectedCaseId(c.case_id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover-neon ${
                    selectedCaseId === c.case_id ? "bg-slate-50" : ""
                  }`}
                >
                  <div className="text-xs font-mono text-[#0033A0]">{c.case_id}</div>
                  <div className="text-sm font-semibold mt-1">{c.title || c.crime_type}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Status: {getFlowStatus(c)} ({c.status})
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="bg-white border border-slate-200 rounded-sm p-6 text-sm text-slate-500">
              Select a case to schedule hearing.
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-sm p-6">
                <div className="micro-label font-mono">{selected.case_id}</div>
                <h2 className="font-display text-2xl font-black tracking-tight mt-1">
                  {selected.title || selected.crime_type}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Current status: {selected.status} · Flow Status: {getFlowStatus(selected)} · Hearing: {selected.hearing_status || "Not Set"}
                </p>
                <p className="text-sm text-slate-600 mt-2">Evidence uploaded: {evidence.length}</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-4">
                <div className="font-display font-bold">View Evidence</div>
                {evidence.length === 0 ? (
                  <div className="text-sm text-slate-500">No evidence uploaded for this case yet.</div>
                ) : (
                  <div className="space-y-3">
                    {evidence.map((ev) => (
                      <div key={ev.evidence_id} className="border border-slate-200 rounded-sm p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">{ev.original_filename || ev.evidence_id}</div>
                            <div className="text-xs font-mono text-slate-500 mt-1">{ev.evidence_id}</div>
                          </div>
                          <div className="text-xs text-slate-500 font-mono">{ev.type}</div>
                        </div>
                        <div className="mt-3 text-sm text-slate-600 space-y-1">
                          <div>Hash: <span className="font-mono text-[11px] break-all">{ev.sha256_hash}</span></div>
                          <div>Approvals: {ev.approvals?.length || 0}</div>
                          <div>Chain Status: {ev.chain_status || "Broken Chain"}</div>
                          <div>Consensus: {ev.approvals?.length >= 2 ? "Reached" : "Pending"}</div>
                          <div>Status: {ev.approvals?.length >= 2 ? "Evidence Trusted ✅" : "Pending Verification ⏳"}</div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => verifyEvidence(ev.evidence_id)}
                            className="bg-[#0033A0] text-white px-3 py-2 text-sm font-semibold rounded-sm hover:bg-[#002370]"
                          >
                            Verify Evidence
                          </button>
                          <button
                            type="button"
                            onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/evidence/${ev.evidence_id}/download`, "_blank")}
                            className="bg-slate-100 text-slate-700 px-3 py-2 text-sm font-semibold rounded-sm hover:bg-slate-200"
                          >
                            View Evidence
                          </button>
                        </div>
                        {verifyResult[ev.evidence_id] && (
                          <div className={`mt-3 rounded-sm px-3 py-2 text-sm ${verifyResult[ev.evidence_id].ok ? "bg-green-50 text-[#14532d]" : "bg-red-50 text-[#991b1b]"}`}>
                            {verifyResult[ev.evidence_id].message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-4">
                <div className="font-display font-bold">Manual Verification</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="micro-label">Verify by Hash</label>
                    <div className="flex gap-2">
                      <input
                        value={manualHashInput}
                        onChange={(e) => setManualHashInput(e.target.value)}
                        placeholder="Paste SHA-256 hash"
                        className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                      />
                      <button
                        type="button"
                        onClick={verifyHashManual}
                        className="bg-[#0033A0] text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-[#002370]"
                      >
                        Verify
                      </button>
                    </div>
                    {manualVerifyResult && (
                      <div className={`rounded-sm p-3 text-sm ${manualVerifyResult.verified ? "bg-green-50 border border-green-200 text-green-900" : "bg-red-50 border border-red-200 text-red-900"}`}>
                        <div className="font-semibold">{manualVerifyResult.message}</div>
                        {manualVerifyResult.filename && <div className="text-xs mt-2">File: {manualVerifyResult.filename}</div>}
                        {manualVerifyResult.evidence_id && <div className="text-xs">Evidence ID: {manualVerifyResult.evidence_id}</div>}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="micro-label">Verify by CID</label>
                    <div className="flex gap-2">
                      <input
                        value={cidVerifyInput}
                        onChange={(e) => setCidVerifyInput(e.target.value)}
                        placeholder="Paste CID"
                        className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                      />
                      <button
                        type="button"
                        onClick={verifyCidManual}
                        className="bg-[#0033A0] text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-[#002370]"
                      >
                        Verify
                      </button>
                    </div>
                    {cidVerifyResult && (
                      <div className={`rounded-sm p-3 text-sm ${cidVerifyResult.verified ? "bg-green-50 border border-green-200 text-green-900" : "bg-red-50 border border-red-200 text-red-900"}`}>
                        <div className="font-semibold">{cidVerifyResult.message}</div>
                        {cidVerifyResult.filename && <div className="text-xs mt-2">File: {cidVerifyResult.filename}</div>}
                        {cidVerifyResult.evidence_id && <div className="text-xs">Evidence ID: {cidVerifyResult.evidence_id}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-[#0033A0]" />
                  <div className="font-display font-bold">Witnesses</div>
                </div>
                {witnesses.length === 0 ? (
                  <div className="text-sm text-slate-500">No witnesses for this case.</div>
                ) : (
                  <div className="space-y-3">
                    {witnesses.map((witness) => (
                      <div key={witness.witness_id} className="border border-slate-200 rounded-sm p-4 bg-slate-50">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-sm">{witness.name}</div>
                              {witness.is_protected && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-amber-50 text-amber-700 border border-amber-300 rounded-sm">
                                  Protected
                                </span>
                              )}
                              {witness.is_confidential && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-red-50 text-red-700 border border-red-300 rounded-sm">
                                  Confidential
                                </span>
                              )}
                              {witness.verification_status === "verified" && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-green-50 text-green-700 border border-green-300 rounded-sm">
                                  Verified
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{witness.witness_id}</div>
                            {witness.contact_info && (
                              <div className="text-xs text-slate-500">Contact: {witness.contact_info}</div>
                            )}
                            <div className="text-xs text-slate-500 mt-1">
                              Uploaded: {(witness.created_at || "").slice(0, 16).replace("T", " ")}
                            </div>
                          </div>
                          {witness.forwarded_to_court && (
                            <span className="text-xs font-semibold text-green-700 px-2 py-1 bg-green-50 rounded-sm border border-green-300">
                              Forwarded to Court
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{witness.statement}</div>
                        
                        {witness.documents && witness.documents.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs font-semibold text-slate-500">Documents</div>
                            {witness.documents.map((doc) => (
                              <div key={doc.document_id} className="text-xs border border-slate-200 rounded-sm p-2 bg-white">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{doc.original_filename}</div>
                                    <div className="text-slate-500 font-mono text-[10px]">Hash: {doc.sha256_hash?.slice(0, 16)}...</div>
                                    {doc.cid && (
                                      <div className="text-slate-500 font-mono text-[10px]">CID: {doc.cid.slice(0, 16)}...</div>
                                    )}
                                    <div className="text-slate-500 text-[10px] mt-1">
                                      Uploaded: {(doc.uploaded_at || "").slice(0, 16).replace("T", " ")}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/witnesses/${witness.witness_id}/download/${doc.document_id}`, "_blank")}
                                      className="text-xs px-2 py-1 rounded-sm border border-slate-300 hover:bg-slate-100 flex items-center gap-1"
                                    >
                                      <Download size={12} /> Download
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {witness.chain_of_custody && witness.chain_of_custody.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs font-semibold text-slate-500">Chain of Custody</div>
                            <div className="text-xs space-y-1">
                              {witness.chain_of_custody.map((entry, idx) => (
                                <div key={idx} className="text-slate-600 bg-white border border-slate-200 rounded-sm p-2">
                                  <div className="font-medium">{entry.action}</div>
                                  <div className="text-slate-500">{entry.performedBy}</div>
                                  <div className="text-slate-500 text-[10px]">{(entry.timestamp || "").slice(0, 16).replace("T", " ")}</div>
                                  {entry.remarks && <div className="text-slate-500 text-[10px] mt-1">{entry.remarks}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-4">
                <div className="font-display font-bold">Approval Panel</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-sm border border-slate-200 p-3">
                    <div className="micro-label">Total Evidence</div>
                    <div className="mt-2 font-semibold">{approvalSummary.total}</div>
                  </div>
                  <div className="rounded-sm border border-slate-200 p-3">
                    <div className="micro-label">Approved Evidence</div>
                    <div className="mt-2 font-semibold">{approvalSummary.approved}</div>
                  </div>
                  <div className="rounded-sm border border-slate-200 p-3">
                    <div className="micro-label">Pending Approval</div>
                    <div className="mt-2 font-semibold">{approvalSummary.pending}</div>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  Court officers can review evidence approval counts here. Evidence approval actions are managed by investigator, forensic, and judge roles.
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={forwardToJudge}
                    disabled={!selected || selected.hearing_status === "Completed" || !selected.hearing_status}
                    className="bg-[#12B76A] text-white px-4 py-2 text-sm font-semibold rounded-sm hover:opacity-90 disabled:opacity-50"
                  >
                    Forward to Judge
                  </button>
                  {selected?.hearing_status === "Completed" && (
                    <div className="text-sm text-green-700 self-center">Already forwarded to judge.</div>
                  )}
                </div>
              </div>

              <form onSubmit={scheduleHearing} className="bg-white border border-slate-200 rounded-sm p-6 space-y-3">
                <div className="font-display font-bold">Schedule Hearing</div>
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    type="datetime-local"
                    required
                    value={hearingDate}
                    onChange={(e) => setHearingDate(e.target.value)}
                    className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  />
                  <input
                    value={scheduleNote}
                    onChange={(e) => setScheduleNote(e.target.value)}
                    placeholder="Schedule note (optional)"
                    className="flex-1 border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  />
                  <button className="bg-[#0033A0] text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-[#002370]">
                    Schedule
                  </button>
                </div>
              </form>

              <form onSubmit={updateHearingStatus} className="bg-white border border-slate-200 rounded-sm p-6 space-y-3">
                <div className="font-display font-bold">Update Hearing Status</div>
                <div className="flex flex-col md:flex-row gap-2">
                  <select
                    value={hearingStatus}
                    onChange={(e) => setHearingStatus(e.target.value)}
                    className="border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  >
                    {HEARING_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Status note (optional)"
                    className="flex-1 border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  />
                  <button className="bg-[#0033A0] text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-[#002370]">
                    Update
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {(pendingAppeals.length > 0 || decidedAppeals.length > 0) && (
        <div className="space-y-8">
          <header className="border-b border-cyan-500/20 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Scale size={22} className="text-cyan-400" />
              <h2 className="font-display text-2xl font-black tracking-tight text-white">Higher court appeals</h2>
            </div>
            <p className="text-sm text-slate-400">Review filings after case closure. Decisions are chained on the ledger.</p>
          </header>

          {pendingAppeals.length > 0 && (
            <section>
              <h3 className="micro-label text-amber-300/90 tracking-[0.2em] mb-3">PENDING APPEALS</h3>
              <div className="grid grid-cols-1 gap-4">
                {pendingAppeals.map((appeal) => (
                  <div
                    key={appeal.id}
                    className="rounded-xl border border-amber-500/25 bg-slate-950/70 p-5 shadow-[0_0_24px_rgba(251,191,36,0.06)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="text-xs font-mono text-amber-300/90 mb-1">{appeal.appeal_id}</div>
                        <div className="font-mono text-sm text-slate-400">Case {appeal.case_id}</div>
                        <div className="text-xs text-slate-500 mt-1">{appeal.requested_at?.slice(0, 19).replace("T", " ")}</div>
                      </div>
                      <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200 ring-1 ring-amber-500/35">
                        Pending
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mb-1">Requested by</div>
                    <div className="text-sm text-slate-200 font-mono">{appeal.requested_by}</div>
                    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                      <div className="micro-label text-slate-500 mb-1">Appeal reason</div>
                      <div className="text-sm text-slate-200 whitespace-pre-wrap">{appeal.reason}</div>
                    </div>
                    {(appeal.lawyer_notes || "").trim() ? (
                      <div className="mt-3 rounded-lg border border-cyan-500/15 bg-cyan-950/20 p-3">
                        <div className="micro-label text-cyan-500/80 mb-1">Lawyer notes</div>
                        <div className="text-sm text-slate-200 whitespace-pre-wrap">{appeal.lawyer_notes}</div>
                      </div>
                    ) : null}
                    {(appeal.documents || []).length > 0 ? (
                      <div className="mt-4 space-y-2">
                        <div className="micro-label text-slate-500">Supporting documents</div>
                        {(appeal.documents || []).map((d, i) => (
                          <div
                            key={`${appeal.id}-d-${i}`}
                            className="flex flex-wrap items-center gap-2 justify-between rounded-lg border border-slate-800 bg-black/20 px-3 py-2 text-xs"
                          >
                            <span className="text-slate-300 truncate max-w-[200px]" title={d.filename}>
                              {d.filename}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => verifyAppealDocHash(d.sha256_hash)}
                                className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-1 text-[10px] font-semibold text-cyan-200 hover:border-cyan-400/50"
                              >
                                <Fingerprint size={12} /> Hash
                              </button>
                              {d.cid ? (
                                <button
                                  type="button"
                                  onClick={() => verifyAppealDocCid(d.cid)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:border-cyan-500/40"
                                >
                                  CID
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-4 space-y-2">
                      <textarea
                        value={appealNote[appeal.case_id] || ""}
                        onChange={(e) => setAppealNote((prev) => ({ ...prev, [appeal.case_id]: e.target.value }))}
                        placeholder="Decision note (optional)"
                        rows={2}
                        disabled={appealSubmitting[appeal.case_id]}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-50"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={appealSubmitting[appeal.case_id]}
                          onClick={() => decideAppeal(appeal.case_id, "accept")}
                          className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-950/60 disabled:opacity-50"
                        >
                          <Check size={16} /> Accept appeal
                        </button>
                        <button
                          type="button"
                          disabled={appealSubmitting[appeal.case_id]}
                          onClick={() => decideAppeal(appeal.case_id, "reject")}
                          className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-rose-500/40 disabled:opacity-50"
                        >
                          <X size={16} /> Reject appeal
                        </button>
                      </div>
                      {appealSubmitting[appeal.case_id] ? (
                        <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-200">
                          Recording decision on chain…
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {decidedAppeals.length > 0 && (
            <section>
              <h3 className="micro-label text-slate-500 tracking-[0.2em] mb-3">APPEAL HISTORY</h3>
              <div className="grid grid-cols-1 gap-3">
                {decidedAppeals.map((appeal) => (
                  <div
                    key={appeal.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 flex flex-wrap items-start justify-between gap-3"
                  >
                    <div>
                      <div className="font-mono text-xs text-cyan-300/80">{appeal.appeal_id}</div>
                      <div className="text-xs text-slate-500 mt-1">{appeal.case_id}</div>
                      <div className="text-xs text-slate-500 mt-2 line-clamp-2 max-w-xl">{appeal.reason}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                        appeal.status === "Accepted"
                          ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
                          : "bg-slate-700/50 text-slate-300 ring-slate-600/50"
                      }`}
                    >
                      {appeal.status}
                    </span>
                    <div className="w-full text-[11px] text-slate-500 border-t border-slate-800/80 pt-2 mt-1">
                      {appeal.status === "Accepted" ? (
                        <span>
                          Case set to <strong className="text-emerald-300">REOPENED</strong>. {appeal.decided_by} ·{" "}
                          {(appeal.decided_at || "").slice(0, 16).replace("T", " ")}
                        </span>
                      ) : (
                        <span>
                          Case remains <strong className="text-slate-300">CLOSED</strong>. {appeal.decided_by} ·{" "}
                          {(appeal.decided_at || "").slice(0, 16).replace("T", " ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
