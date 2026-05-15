import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { openIpfsUrl } from "@/lib/utils";
import { toast } from "sonner";
import { ShieldCheck, Link2, CheckCircle2, XCircle, Eye, RotateCcw, Download, Scale, Check, X, Fingerprint, Users } from "lucide-react";

const VERDICTS = ["Guilty", "Not Guilty", "Further Investigation"];

export default function Judge() {
  const [items, setItems] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [evidence, setEvidence] = useState([]);
  const [witnesses, setWitnesses] = useState([]);
  const [verifyResult, setVerifyResult] = useState({});
  const [approveResult, setApproveResult] = useState({});

  const [verdict, setVerdict] = useState("Guilty");
  const [decisionNote, setDecisionNote] = useState("");
  const [orderFile, setOrderFile] = useState(null);
  const [closeNote, setCloseNote] = useState("");
  const [accusedSuspectId, setAccusedSuspectId] = useState("");
  const [sentence, setSentence] = useState("");
  const [sentenceDurationYears, setSentenceDurationYears] = useState(0);
  const [sentenceDurationMonths, setSentenceDurationMonths] = useState(0);
  const [fineAmount, setFineAmount] = useState(0);
  const [paroleEligible, setParoleEligible] = useState(false);
  const [imprisonmentStartDate, setImprisonmentStartDate] = useState("");
  const [ppcSections, setPpcSections] = useState("");
  const [hearingNotes, setHearingNotes] = useState("");
  const [judgeRemarks, setJudgeRemarks] = useState("");
  const [caseActionNote, setCaseActionNote] = useState("");

  const [appeals, setAppeals] = useState([]);
  const [appealSubmitting, setAppealSubmitting] = useState({});
  const [appealNote, setAppealNote] = useState({});
  const [overviewStats, setOverviewStats] = useState(null);

  const loadCases = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/judge/cases");
      setItems(data || []);
      if ((data || []).length > 0) {
        setSelectedCaseId((prev) => prev || data[0].case.case_id);
      } else {
        setSelectedCaseId("");
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

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

  const approveEvidence = async (evidenceId) => {
    if (!evidenceId) return;
    try {
      const { data } = await api.post(`/evidence/${evidenceId}/approve`);
      setApproveResult((prev) => ({ ...prev, [evidenceId]: data }));
      if (data.ok) {
        toast.success(data.message || "Evidence approved");
      } else {
        toast.error(data.message || "Approval failed");
      }
      await loadEvidence(selectedCaseId);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const judgeEvidenceAction = async (evidenceId, action) => {
    if (!evidenceId) return;
    try {
      const { data } = await api.post("/judge/evidence-action", {
        evidence_id: evidenceId,
        action,
        note: caseActionNote,
      });
      toast.success(data?.message || "Action completed");
      await loadCases();
      await loadEvidence(selectedCaseId);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const returnCase = async (target) => {
    if (!selected) return;
    try {
      await api.post("/judge/return-case", {
        case_id: selected.case.case_id,
        target,
        note: caseActionNote,
      });
      toast.success(`Case returned to ${target}`);
      setCaseActionNote("");
      await loadCases();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
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
    () => items.find((it) => it.case.case_id === selectedCaseId) || null,
    [items, selectedCaseId]
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

  const getForensicReportStatus = (caseItem) => {
    const reports = caseItem?.forensic_reports || [];
    if (reports.length === 0) {
      return { status: "No report", color: "bg-slate-100 text-slate-700" };
    }
    const hasVerified = reports.some((r) => r.result === "Verified");
    if (hasVerified) {
      return { status: "Verified", color: "bg-green-100 text-green-700" };
    }
    return { status: "Report uploaded", color: "bg-blue-100 text-blue-700" };
  };

  const submitVerdict = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const form = new FormData();
      form.append("case_id", selected.case.case_id);
      form.append("verdict", verdict);
      form.append("decision_note", decisionNote);
      form.append("accused_suspect_id", accusedSuspectId);
      form.append("sentence", sentence);
      form.append("sentence_duration_years", sentenceDurationYears.toString());
      form.append("sentence_duration_months", sentenceDurationMonths.toString());
      form.append("fine_amount", fineAmount.toString());
      form.append("parole_eligible", paroleEligible.toString());
      form.append("imprisonment_start_date", imprisonmentStartDate);
      form.append("ppc_sections", ppcSections);
      form.append("hearing_notes", hearingNotes);
      form.append("judge_remarks", judgeRemarks);
      if (orderFile) {
        form.append("final_order_file", orderFile);
      }
      await api.post("/judge/submit-verdict", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Verdict submitted");
      setDecisionNote("");
      setAccusedSuspectId("");
      setSentence("");
      setSentenceDurationYears(0);
      setSentenceDurationMonths(0);
      setFineAmount(0);
      setParoleEligible(false);
      setImprisonmentStartDate("");
      setPpcSections("");
      setHearingNotes("");
      setJudgeRemarks("");
      setOrderFile(null);
      await loadCases();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const closeCase = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await api.post("/judge/close-case", {
        case_id: selected.case.case_id,
        note: closeNote.trim(),
      });
      toast.success("Case closed");
      setCloseNote("");
      await loadCases();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2">Judicial Module</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">Judge Verdicts</h1>
        <p className="text-sm text-slate-600 mt-2">Review evidence, accused profiles, and forensic reports. Issue final verdicts against accused persons.</p>
        <div className="mt-3 rounded-sm border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Judge Role:</strong> Only verdict issuance. Evidence verification and case reviews are handled by Court Officers.
        </div>
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
          <div className="px-4 py-3 border-b border-slate-200 micro-label">Judge Cases</div>
          {loading ? (
            <div className="px-4 py-6 text-sm text-slate-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">No cases available for judgment.</div>
          ) : (
            <div className="max-h-[620px] overflow-y-auto">
              {items.map((it) => (
                <button
                  key={it.case.case_id}
                  onClick={() => setSelectedCaseId(it.case.case_id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover-neon transition-colors ${
                    selectedCaseId === it.case.case_id ? "bg-slate-50" : ""
                  }`}
                >
                  <div className="text-xs font-mono text-[#0033A0]">{it.case.case_id}</div>
                  <div className="text-sm font-semibold mt-1">{it.case.title || it.case.crime_type}</div>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <div className="text-xs text-slate-500">{it.case.status}</div>
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-sm ${getForensicReportStatus(it).color}`}>
                      {getForensicReportStatus(it).status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="bg-white border border-slate-200 rounded-sm p-6 text-sm text-slate-500">
              Select a case to view details.
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-3">
                <div className="micro-label font-mono">{selected.case.case_id}</div>
                <h2 className="font-display text-2xl font-black tracking-tight">
                  {selected.case.title || selected.case.crime_type}
                </h2>
                <div className="text-sm"><span className="font-semibold">FIR:</span> {selected.case.fir_id}</div>
                <div className="text-sm"><span className="font-semibold">Crime:</span> {selected.fir?.crime_type || "-"}</div>
                <div className="text-sm whitespace-pre-wrap">
                  <span className="font-semibold">FIR Description:</span> {selected.fir?.description || "-"}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-sm p-6">
                <div className="font-display font-bold mb-3">Investigation Notes</div>
                {selected.investigation_notes?.length ? (
                  <div className="space-y-2">
                    {selected.investigation_notes.map((n) => (
                      <div key={n.id} className="text-sm border-b border-slate-100 pb-2">
                        <div>{n.note}</div>
                        <div className="text-xs text-slate-500 mt-1">{n.created_by}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No investigation notes.</div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-sm p-6">
                <div className="font-display font-bold mb-3">Forensic Reports</div>
                {selected.forensic_reports?.length ? (
                  <div className="space-y-3">
                    {selected.forensic_reports.map((r) => (
                      <div key={r.id} className="text-sm border-b border-slate-100 pb-2">
                        <div className="font-semibold">{r.report_title}</div>
                        <div className="text-xs text-slate-500 mt-1">Result: {r.result}</div>
                        <div className="mt-1 whitespace-pre-wrap">{r.summary}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No forensic reports.</div>
                )}
                {(selected.forensic_report_files || []).length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="micro-label">Completed Report Files</div>
                    {(selected.forensic_report_files || []).map((rf) => (
                      <div key={rf.report_file_id} className="border border-slate-200 rounded-sm p-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold">{rf.original_filename}</div>
                            <div className="text-xs text-slate-500 font-mono">{rf.report_file_id}</div>
                          </div>
                          <div className="text-xs text-slate-500">{rf.uploaded_by}</div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          Hash: <span className="font-mono break-all">{rf.sha256_hash}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          CID: <span className="font-mono break-all">{rf.cid || "No CID"}</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">Approvals: {rf.approvals?.length || 0}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/forensic/reports/${rf.report_file_id}/download`, "_blank")} className="btn-secondary px-3 py-1 rounded-sm text-xs font-semibold inline-flex items-center gap-1">
                            <Download size={13} /> Download
                          </button>
                          <button type="button" onClick={async () => {
                            try {
                              const { data } = await api.get(`/forensic/reports/${rf.report_file_id}/verify-hash`);
                              toast[data.ok ? "success" : "error"](data.message);
                              await loadCases();
                            } catch (e) {
                              toast.error(formatApiError(e.response?.data?.detail) || e.message);
                            }
                          }} className="btn-primary px-3 py-1 rounded-sm text-xs font-semibold inline-flex items-center gap-1">
                            <ShieldCheck size={13} /> Verify Hash
                          </button>
                          <button type="button" onClick={async () => {
                            try {
                              const { data } = await api.get(`/forensic/reports/${rf.report_file_id}/verify-cid`);
                              toast[data.ok ? "success" : "error"](data.message);
                              await loadCases();
                            } catch (e) {
                              toast.error(formatApiError(e.response?.data?.detail) || e.message);
                            }
                          }} className="btn-secondary px-3 py-1 rounded-sm text-xs font-semibold inline-flex items-center gap-1">
                            <Link2 size={13} /> Verify CID
                          </button>
                          {rf.cid && (
                            <button type="button" onClick={async () => {
                              const { ok, error } = await openIpfsUrl(rf.cid, null);
                              if (!ok) toast.error(error || "IPFS content temporarily unavailable");
                            }} className="btn-secondary px-3 py-1 rounded-sm text-xs font-semibold inline-flex items-center gap-1">
                              <Eye size={13} /> Open IPFS
                            </button>
                          )}
                        </div>
                        {(rf.chainOfCustody || []).length > 0 && (
                          <div className="mt-2 text-xs text-slate-500">
                            Chain: {(rf.chainOfCustody || []).length} entries
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-sm p-6">
                <div className="font-display font-bold mb-3">Suspects / Accused</div>
                {selected.suspects?.length ? (
                  <div className="space-y-2">
                    {selected.suspects.map((s) => (
                      <div key={s.suspect_id} className="text-sm border-b border-slate-100 pb-2">
                        <div className="font-semibold">{s.name} {s.is_accused ? "(Accused)" : "(Suspect)"}</div>
                        <div className="text-xs text-slate-500 mt-1">CNIC: {s.cnic || "—"} · Arrest: {s.arrest_status || "—"}</div>
                        <div className="text-xs text-slate-500">PPC: {(s.charges_under_ppc || []).join(", ") || "Not listed"}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No suspect records linked to this case.</div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-4">
                <div className="font-display font-bold">Evidence</div>
                {evidence.length === 0 ? (
                  <div className="text-sm text-slate-500">No evidence uploaded for this case.</div>
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
                            className="btn-primary px-3 py-2 text-sm font-semibold rounded-sm"
                          >
                            <span className="inline-flex items-center gap-1"><ShieldCheck size={14} /> Verify Hash</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => approveEvidence(ev.evidence_id)}
                            className="btn-success px-3 py-2 text-sm font-semibold rounded-sm"
                          >
                            <span className="inline-flex items-center gap-1"><CheckCircle2 size={14} /> Approve Evidence</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => judgeEvidenceAction(ev.evidence_id, "verify_cid")}
                            className="btn-secondary px-3 py-2 text-sm font-semibold rounded-sm"
                          >
                            <span className="inline-flex items-center gap-1"><Link2 size={14} /> Verify CID</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => judgeEvidenceAction(ev.evidence_id, "reject")}
                            className="btn-danger px-3 py-2 text-sm font-semibold rounded-sm"
                          >
                            <span className="inline-flex items-center gap-1"><XCircle size={14} /> Reject Evidence</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/evidence/${ev.evidence_id}/download`, "_blank")}
                            className="bg-slate-100 text-slate-700 px-3 py-2 text-sm font-semibold rounded-sm hover:bg-slate-200/80"
                          >
                            <span className="inline-flex items-center gap-1"><Eye size={14} /> View File</span>
                          </button>
                        </div>
                        {(verifyResult[ev.evidence_id] || approveResult[ev.evidence_id]) && (
                          <div className="mt-3 space-y-2 text-sm">
                            {verifyResult[ev.evidence_id] && (
                              <div className={`rounded-sm px-3 py-2 ${verifyResult[ev.evidence_id].ok ? "bg-green-50 text-[#14532d]" : "bg-red-50 text-[#991b1b]"}`}>
                                {verifyResult[ev.evidence_id].message}
                              </div>
                            )}
                            {approveResult[ev.evidence_id] && (
                              <div className="rounded-sm px-3 py-2 bg-blue-50 text-slate-800">
                                {approveResult[ev.evidence_id].message || "Approval recorded."}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={submitVerdict} className="bg-white border border-slate-200 rounded-sm p-6 space-y-3">
                <div className="font-display font-bold">Submit Verdict</div>
                <div className="flex flex-col md:flex-row gap-2">
                  <select
                    value={accusedSuspectId}
                    onChange={(e) => setAccusedSuspectId(e.target.value)}
                    className="border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0] min-w-[240px]"
                  >
                    <option value="">Select accused suspect</option>
                    {(selected.suspects || []).map((s) => (
                      <option key={s.suspect_id} value={s.suspect_id}>
                        {s.name} ({s.suspect_id})
                      </option>
                    ))}
                  </select>
                  <input
                    value={sentence}
                    onChange={(e) => setSentence(e.target.value)}
                    placeholder="Sentence"
                    className="flex-1 border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <select
                    value={verdict}
                    onChange={(e) => setVerdict(e.target.value)}
                    className="border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  >
                    {VERDICTS.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                  <input
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder="Decision note"
                    className="flex-1 border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  />
                </div>
                <input
                  value={ppcSections}
                  onChange={(e) => setPpcSections(e.target.value)}
                  placeholder="PPC sections (comma separated)"
                  className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                />
                <textarea
                  value={hearingNotes}
                  onChange={(e) => setHearingNotes(e.target.value)}
                  placeholder="Hearing notes"
                  rows={2}
                  className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                />
                <textarea
                  value={judgeRemarks}
                  onChange={(e) => setJudgeRemarks(e.target.value)}
                  placeholder="Judge remarks"
                  rows={2}
                  className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                />
                <input
                  type="file"
                  onChange={(e) => setOrderFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
                <button className="btn-primary px-4 py-2 text-sm font-semibold rounded-sm">
                  Submit Verdict
                </button>
              </form>

              <form onSubmit={closeCase} className="bg-white border border-slate-200 rounded-sm p-6 space-y-3">
                <div className="font-display font-bold">Close Case</div>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={closeNote}
                    onChange={(e) => setCloseNote(e.target.value)}
                    placeholder="Closing note (optional)"
                    className="flex-1 border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  />
                  <button className="btn-primary px-4 py-2 text-sm font-semibold rounded-sm">
                    Close Case
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
