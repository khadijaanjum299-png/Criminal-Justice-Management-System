import { useEffect, useMemo, useState, useCallback } from "react";
import { api, formatApiError } from "@/lib/api";
import { getIpfsViewUrl, openIpfsUrl } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Fingerprint, ShieldCheck, AlertTriangle, FileText, CheckCircle, XCircle, Eye, Upload, Send, Download, Link2 } from "lucide-react";

function getFlowStatus(caseDoc) {
  const status = caseDoc?.status || "";
  const hearing = caseDoc?.hearing_status || "";
  if (["FIR Registered", "Approved", "Rejected"].includes(status)) return "FIR Filed";
  if (["Under Investigation", "Evidence Collected"].includes(status)) return "Under Investigation";
  if (["Forensic Review", "Sent to Forensic Review", "Forensic Review Completed"].includes(status)) return "Forensic Review";
  if (status === "Sent to Court") return "Ready for Court";
  if (status === "Hearing Scheduled" || hearing) return "In Court";
  if (["Judgment Issued", "Closed"].includes(status)) return "In Court";
  return "FIR Filed";
}

export default function Forensic() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("cases");
  const [ipfsStatus, setIpfsStatus] = useState({ connected: false, status: "Unknown", gateway_url: "http://127.0.0.1:8080/ipfs" });
  const [report, setReport] = useState({
    report_title: "",
    summary: "",
    examiner_name: "",
    lab_name: "",
    verified_evidence_ids: "",
    matching_hashes: "",
    ai_tampering_analysis: "",
    final_conclusion: "",
    digital_signature: "",
    image_analysis: "",
    log_analysis: "",
    ip_analysis: "",
    call_data_analysis: "",
    result: "Verified",
    send_to_court: true,
  });
  const [verifyByEvidence, setVerifyByEvidence] = useState({});
  const [verifyNoteByEvidence, setVerifyNoteByEvidence] = useState({});
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [hashVerifyInput, setHashVerifyInput] = useState("");
  const [cidVerifyInput, setCidVerifyInput] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [cidVerificationResult, setCidVerificationResult] = useState(null);
  const [forwarding, setForwarding] = useState(false);
  const [hashVerifiedOkByEvidenceId, setHashVerifiedOkByEvidenceId] = useState({});
  const [hashVerifyFile, setHashVerifyFile] = useState(null);
  const [forensicFile, setForensicFile] = useState(null);
  const [forensicDesc, setForensicDesc] = useState("");
  const [uploadingForensicFile, setUploadingForensicFile] = useState(false);
  const [completedReportFile, setCompletedReportFile] = useState(null);
  const [completedReportDesc, setCompletedReportDesc] = useState("");
  const [uploadingCompletedReport, setUploadingCompletedReport] = useState(false);
  const [overviewStats, setOverviewStats] = useState(null);

  const canUseForensicModule = user.role === "forensic";

  const openFromIpfs = useCallback(
    async (cid) => {
      if (!cid) return;
      const { ok, error } = await openIpfsUrl(cid, ipfsStatus?.connected ? ipfsStatus?.gateway_url : null);
      if (!ok) {
        toast.error(error || "IPFS content temporarily unavailable");
      }
    },
    [ipfsStatus]
  );

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

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/forensic/cases");
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

  useEffect(() => {
    if (canUseForensicModule) {
      load();
    }
  }, [canUseForensicModule]);

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
    if (!canUseForensicModule) return;
    const t = setInterval(() => {
      load();
    }, 20000);
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [canUseForensicModule]);

  const selected = useMemo(
    () => items.find((it) => it.case.case_id === selectedCaseId) || null,
    [items, selectedCaseId]
  );

  const selectedEvidence = useMemo(
    () => selected?.evidence?.find((ev) => ev.evidence_id === selectedEvidenceId) || null,
    [selected, selectedEvidenceId]
  );

  const chainSummary = useMemo(() => {
    const ev = selected?.evidence || [];
    const total = ev.length;
    const valid = ev.filter((e) => String(e.chain_status || "").toLowerCase() === "valid").length;
    const invalid = ev.filter((e) => e.chain_status && String(e.chain_status || "").toLowerCase() !== "valid").length;
    const unknown = total - valid - invalid;
    const approvals = ev.reduce((sum, e) => sum + (e.approvals?.length || 0), 0);
    const withCid = ev.filter((e) => !!e.cid).length;
    const withBlock = ev.filter((e) => e.block_index !== null && e.block_index !== undefined).length;
    const maxBlockIndex = ev.reduce((m, e) => {
      const v = Number(e.block_index);
      return Number.isFinite(v) ? Math.max(m, v) : m;
    }, -1);
    return { total, valid, invalid, unknown, approvals, withCid, withBlock, maxBlockIndex };
  }, [selected]);

  const uploadReport = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await api.post("/forensic/upload-report", {
        case_id: selected.case.case_id,
        ...report,
        verified_evidence_ids: report.verified_evidence_ids
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        matching_hashes: report.matching_hashes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast.success("Forensic report uploaded");
      setReport({
        report_title: "",
        summary: "",
        examiner_name: "",
        lab_name: "",
        verified_evidence_ids: "",
        matching_hashes: "",
        ai_tampering_analysis: "",
        final_conclusion: "",
        digital_signature: "",
        image_analysis: "",
        log_analysis: "",
        ip_analysis: "",
        call_data_analysis: "",
        result: "Verified",
        send_to_court: true,
      });
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const verifyEvidence = async (evidenceId) => {
    if (!evidenceId) return;
    try {
      await api.post("/forensic/verify-evidence", {
        evidence_id: evidenceId,
        verdict: verifyByEvidence[evidenceId] || "Verified",
        note: verifyNoteByEvidence[evidenceId] || "",
      });
      toast.success("Evidence verification saved");
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const verifyEvidenceHash = async (evidenceId) => {
    if (!evidenceId) return;
    try {
      const { data } = await api.get(`/evidence/${evidenceId}/verify`);
      setVerificationResult(data);
      setHashVerifiedOkByEvidenceId((m) => ({ ...m, [evidenceId]: !!data.ok }));
      toast[data.ok ? "success" : "error"](data.message || "Hash verification completed");
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const sha256HexOfFile = async (file) => {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const verifyUploadedFileAgainstSelected = async () => {
    if (!selectedEvidence) {
      toast.error("Select evidence first.");
      return;
    }
    if (!hashVerifyFile) {
      toast.error("Upload a file to verify.");
      return;
    }
    try {
      const computed = await sha256HexOfFile(hashVerifyFile);
      const ok = computed === selectedEvidence.sha256_hash;
      setVerificationResult({
        ok,
        message: ok ? "File hash matches - AUTHENTIC" : "File hash mismatch - TAMPER DETECTED",
        evidence_id: selectedEvidence.evidence_id,
        original_hash: selectedEvidence.sha256_hash,
        current_hash: computed,
      });
      setHashVerifiedOkByEvidenceId((m) => ({ ...m, [selectedEvidence.evidence_id]: ok }));
      toast[ok ? "success" : "error"](ok ? "Authenticated" : "Tamper detected");
    } catch (e) {
      toast.error(e?.message || "Unable to verify file hash");
    }
  };

  const verifyEvidenceCid = async () => {
    if (!cidVerifyInput.trim()) {
      toast.error("Enter a CID to verify.");
      return;
    }
    try {
      const { data } = await api.post("/verify/cid", { cid: cidVerifyInput.trim() });
      setCidVerificationResult(data);
      toast[data.verified ? "success" : "error"](data.message || "CID verification completed");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const approveEvidence = async (evidenceId) => {
    if (!evidenceId) return;
    if (!hashVerifiedOkByEvidenceId[evidenceId]) {
      toast.error("Verify hash first, then approve.");
      return;
    }
    try {
      const { data } = await api.post(`/evidence/${evidenceId}/approve`);
      if (data.ok) {
        toast.success(data.message || "Evidence approved");
        await load();
      } else {
        toast.error(data.message || "Approval failed");
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const generateSummary = () => {
    if (!selected) return "No case selected.";
    const evidenceCount = selected.evidence?.length || 0;
    const suspicious = (selected.evidence || []).filter(
      (ev) => ev.tampered || ev.forensic_verdict === "Suspicious"
    ).length;
    const verified = (selected.evidence || []).filter(
      (ev) => !ev.tampered && (ev.forensic_verdict === "Verified" || !ev.forensic_verdict)
    ).length;
    return [
      `Case ID: ${selected.case.case_id}`,
      `Current Status: ${selected.case.status}`,
      `Total Evidence Items: ${evidenceCount}`,
      `Verified Evidence: ${verified}`,
      `Suspicious/Tampered Evidence: ${suspicious}`,
      `Reports Submitted: ${selected.reports?.length || 0}`,
      suspicious > 0
        ? "Risk Alert: Suspicious evidence detected. Recommend legal caution."
        : "Integrity Check: No suspicious evidence currently detected.",
    ].join("\n");
  };

  const forwardToCourt = async () => {
    if (!selected) return;
    const hasReport = (selected.reports || []).length > 0;
    const hasVerifiedEvidence = (selected.evidence || []).some(
      (ev) => ev.forensic_verdict || ev.verified_at
    );
    if (!hasReport && !hasVerifiedEvidence) {
      toast.error("Complete analysis/verification before forwarding to Court.");
      return;
    }
    setForwarding(true);
    try {
      await api.patch(`/cases/${selected.case.case_id}/status`, {
        status: "forwarded_to_court",
        forwarded_to: "court",
        remarks: "Forwarded by forensic after analysis/verification",
      });
      toast.success("Case forwarded to Court");
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setForwarding(false);
    }
  };

  if (!canUseForensicModule) {
    return <div className="micro-label">You are not authorized to access this module.</div>;
  }

  const uploadForensicFile = async (e) => {
    e.preventDefault();
    if (!selected) {
      toast.error("Select a case first.");
      return;
    }
    if (!forensicFile) {
      toast.error("Select a forensic file to upload.");
      return;
    }
    setUploadingForensicFile(true);
    try {
      const fd = new FormData();
      fd.append("case_id", selected.case.case_id);
      fd.append("description", forensicDesc);
      fd.append("file", forensicFile);
      await api.post("/forensic/upload-file", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Forensic artifact uploaded");
      setForensicFile(null);
      setForensicDesc("");
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setUploadingForensicFile(false);
    }
  };

  const downloadReportTemplate = async () => {
    try {
      const res = await api.get("/forensic/report-template", { responseType: "blob" });
      const contentType = res.headers?.["content-type"] || "";
      const ext = contentType.includes("wordprocessingml") ? "docx" : "txt";
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `sample_forensic_report_template.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Template downloaded.");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const uploadCompletedReport = async (e) => {
    e.preventDefault();
    if (!selected) {
      toast.error("Select a case from the Cases tab first.");
      return;
    }
    if (!completedReportFile) {
      toast.error("Select a completed report file.");
      return;
    }
    setUploadingCompletedReport(true);
    try {
      const fd = new FormData();
      fd.append("case_id", selected.case.case_id);
      fd.append("description", completedReportDesc);
      fd.append("file", completedReportFile);
      await api.post("/forensic/upload-completed-report", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Completed forensic report uploaded.");
      setCompletedReportFile(null);
      setCompletedReportDesc("");
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setUploadingCompletedReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2">Digital Forensics Lab</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">Forensic Dashboard</h1>
        <p className="text-sm text-slate-600 mt-2">
          Review investigation-forwarded cases, verify evidence integrity, and upload forensic reports.
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

      {/* Tab Navigation */}
      <div className="bg-white border border-slate-200 rounded-sm p-1 overflow-x-auto scroll-slim">
        <div className="flex flex-nowrap space-x-1 min-w-max">
          {[
            { id: "cases", label: "Assigned Cases", icon: FileText },
            { id: "evidence", label: "Evidence Queue", icon: ShieldCheck },
            { id: "verification", label: "Evidence Verification", icon: CheckCircle },
            { id: "cid", label: "CID Verification", icon: Eye },
            { id: "hash", label: "Hash Verification", icon: AlertTriangle },
            { id: "approval", label: "Approval Panel", icon: CheckCircle },
            { id: "uploads", label: "Forensic Uploads", icon: Upload },
            { id: "reports", label: "Forensic Reports", icon: Upload },
            { id: "blockchain", label: "Blockchain Validation", icon: Send },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-sm transition-colors ${
                activeTab === tab.id
                  ? "btn-primary text-white"
                  : "text-slate-400 hover-neon hover:text-slate-100"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "cases" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 micro-label">Cases Sent by Investigators</div>
            {loading ? (
              <div className="px-4 py-6 text-sm text-slate-500">Loading cases...</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">No cases available for forensic review.</div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto pb-4">
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
                    <div className="text-xs text-slate-500 mt-1">
                      Status: {getFlowStatus(it.case)} ({it.case.status})
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {!selected ? (
              <div className="bg-white border border-slate-200 rounded-sm p-6 text-sm text-slate-500">
                Select a case to review evidence and upload report.
              </div>
            ) : (
              <>
                <div className="bg-white border border-slate-200 rounded-sm p-6">
                  <div className="micro-label font-mono">{selected.case.case_id}</div>
                  <h2 className="font-display text-2xl font-black tracking-tight mt-1">
                    {selected.case.title || selected.case.crime_type}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Status: {selected.case.status} · Flow Status: {getFlowStatus(selected.case)} · FIR: {selected.case.fir_id}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "evidence" && (
        <div className="bg-white border border-slate-200 rounded-sm p-6">
          <div className="font-display font-bold mb-4">Evidence Queue</div>
          {!selected ? (
            <div className="text-sm text-slate-500">Select a case from the Cases tab first.</div>
          ) : selected.evidence?.length === 0 ? (
            <div className="text-sm text-slate-500">No evidence uploaded for this case yet.</div>
          ) : (
            <div className="space-y-4">
              {selected.evidence.map((ev) => (
                <div key={ev.evidence_id} className="border border-slate-200 rounded-sm p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="text-xs font-mono text-[#0033A0]">{ev.evidence_id}</div>
                      <div className="text-sm font-semibold">{ev.original_filename || ev.type}</div>
                    </div>
                    <div className="text-xs font-mono text-slate-500">{ev.type}</div>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm min-w-max">
                      <div>
                        <div className="micro-label">Hash</div>
                        <div className="font-mono text-[11px] break-all">{ev.sha256_hash?.slice(0, 24)}…</div>
                      </div>
                      <div>
                        <div className="micro-label">CID</div>
                        <div className="font-mono text-[11px] break-all">{ev.cid || "None"}</div>
                      </div>
                      <div>
                        <div className="micro-label">IPFS Status</div>
                        <div className={`${ev.ipfs_status === "online" ? "text-green-700" : ev.ipfs_status === "failed" ? "text-red-700" : "text-yellow-600"}`}>
                          {ev.ipfs_status || "offline"}
                        </div>
                      </div>
                      <div>
                        <div className="micro-label">Approvals</div>
                        <div>{ev.approvals?.length || 0}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => {
                        setSelectedEvidenceId(ev.evidence_id);
                        setActiveTab("verification");
                      }}
                      className="text-xs font-semibold px-3 py-1 border border-slate-300 rounded-sm hover-neon"
                    >
                      Review
                    </button>
                    {ev.cid && (
                      <button
                        onClick={() => openFromIpfs(ev.cid)}
                        className="text-xs font-semibold px-3 py-1 bg-slate-900 text-white rounded-sm hover:bg-slate-800"
                      >
                        <span className="inline-flex items-center gap-1"><Eye size={14} /> View IPFS</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "verification" && (
        <div className="bg-white border border-slate-200 rounded-sm p-6">
          <div className="font-display font-bold mb-4">Evidence Verification</div>
          {!selected ? (
            <div className="text-sm text-slate-500">Select a case from the Cases tab first.</div>
          ) : !selectedEvidence ? (
            <div className="text-sm text-slate-500">Select evidence from the Evidence Queue tab first.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-sm border border-slate-200 p-3">
                  <div className="micro-label">Hash</div>
                  <div className="font-mono text-[11px] break-all mt-2">{selectedEvidence.sha256_hash}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-3">
                  <div className="micro-label">CID</div>
                  <div className="font-mono text-[11px] break-all mt-2">{selectedEvidence.cid || "Not available"}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-3">
                  <div className="micro-label">Uploaded By</div>
                  <div className="mt-2">{selectedEvidence.uploaded_by}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-3">
                  <div className="micro-label">Uploaded At</div>
                  <div className="mt-2">{selectedEvidence.uploaded_at}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => verifyEvidenceHash(selectedEvidence.evidence_id)}
                  className="btn-primary px-4 py-2 rounded-sm text-sm font-semibold"
                >
                  <span className="inline-flex items-center gap-1"><ShieldCheck size={14} /> Verify Hash</span>
                </button>
                {selectedEvidence.cid && (
                  <button
                    onClick={() => openFromIpfs(selectedEvidence.cid)}
                    className="btn-secondary px-4 py-2 rounded-sm text-sm font-semibold"
                  >
                    <span className="inline-flex items-center gap-1"><Eye size={14} /> View IPFS</span>
                  </button>
                )}
              </div>
              {verificationResult && verificationResult.evidence_id === selectedEvidence.evidence_id && (
                <div className={`rounded-sm p-3 text-sm ${verificationResult.ok ? "bg-green-50 border border-green-200 text-green-900" : "bg-red-50 border border-red-200 text-red-900"}`}>
                  <div className="font-semibold">{verificationResult.message}</div>
                  <div className="mt-2 text-xs">Original hash: {verificationResult.original_hash}</div>
                  <div className="text-xs">Current hash: {verificationResult.current_hash}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "cid" && (
        <div className="bg-white border border-slate-200 rounded-sm p-6">
          <div className="font-display font-bold mb-4">CID Verification</div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={cidVerifyInput}
                onChange={(e) => setCidVerifyInput(e.target.value)}
                placeholder="Paste CID to verify"
                className="w-full border border-slate-300 px-3 py-2 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0] text-sm"
              />
              <button
                onClick={verifyEvidenceCid}
                className="btn-primary px-4 py-2 rounded-sm text-sm font-semibold"
              >
                <span className="inline-flex items-center gap-1"><ShieldCheck size={14} /> Verify CID</span>
              </button>
            </div>
            {cidVerificationResult && (
              <div className={`rounded-sm p-3 text-sm ${cidVerificationResult.verified ? "bg-green-50 border border-green-200 text-green-900" : "bg-red-50 border border-red-200 text-red-900"}`}>
                <div className="font-semibold">{cidVerificationResult.message}</div>
                {cidVerificationResult.sha256_hash && (
                  <div className="mt-2 text-xs">Expected hash: {cidVerificationResult.sha256_hash}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "hash" && (
        <div className="bg-white border border-slate-200 rounded-sm p-6">
          <div className="font-display font-bold mb-4">Hash Verification</div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={hashVerifyInput}
                onChange={(e) => setHashVerifyInput(e.target.value)}
                placeholder="Paste hash to verify"
                className="w-full border border-slate-300 px-3 py-2 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0] text-sm"
              />
              <button
                onClick={() => {
                  if (!selectedEvidence) return;
                  const ok = hashVerifyInput.trim() === selectedEvidence.sha256_hash;
                  setVerificationResult({ ok, message: ok ? "Hash matches - AUTHENTIC" : "Hash mismatch - TAMPER DETECTED", evidence_id: selectedEvidence.evidence_id, original_hash: selectedEvidence.sha256_hash, current_hash: hashVerifyInput.trim() });
                  setHashVerifiedOkByEvidenceId((m) => ({ ...m, [selectedEvidence.evidence_id]: ok }));
                }}
                className="btn-primary px-4 py-2 rounded-sm text-sm font-semibold"
              >
                <span className="inline-flex items-center gap-1"><ShieldCheck size={14} /> Verify Hash</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="file"
                onChange={(e) => setHashVerifyFile(e.target.files?.[0] || null)}
                className="w-full border border-slate-300 px-3 py-2 rounded-sm text-sm"
              />
              <button
                onClick={verifyUploadedFileAgainstSelected}
                className="btn-secondary px-4 py-2 rounded-sm text-sm font-semibold"
              >
                <span className="inline-flex items-center gap-1"><ShieldCheck size={14} /> Verify File Hash</span>
              </button>
            </div>
            {verificationResult && (
              <div className={`rounded-sm p-3 text-sm ${verificationResult.ok ? "bg-green-50 border border-green-200 text-green-900" : "bg-red-50 border border-red-200 text-red-900"}`}>
                <div className="font-semibold">{verificationResult.ok ? "AUTHENTICATED" : "TAMPER DETECTED"}</div>
                <div>{verificationResult.message}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "approval" && (
        <div className="bg-white border border-slate-200 rounded-sm p-6">
          <div className="font-display font-bold mb-4">Approval Panel</div>
          {!selected ? (
            <div className="text-sm text-slate-500">Select a case from the Cases tab first.</div>
          ) : !selectedEvidence ? (
            <div className="text-sm text-slate-500">Select evidence from the Evidence Queue tab first.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-sm border border-slate-200 p-3">
                  <div className="micro-label">Current Approvals</div>
                  <div className="text-xl font-black mt-2">{selectedEvidence.approvals?.length || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">{(selectedEvidence.approvals?.length || 0) >= 2 ? "EVIDENCE TRUSTED ✅" : "PENDING VERIFICATION ⏳"}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-3">
                  <div className="micro-label">Trust Status</div>
                  <div className="text-xl font-black mt-2">{selectedEvidence.chain_status || "Unknown"}</div>
                  <div className="text-xs text-slate-500 mt-1">Blockchain validation status</div>
                </div>
              </div>
              <button
                onClick={() => approveEvidence(selectedEvidence.evidence_id)}
                disabled={!hashVerifiedOkByEvidenceId[selectedEvidence.evidence_id]}
                className="btn-success px-4 py-2 rounded-sm text-sm font-semibold"
              >
                <span className="inline-flex items-center gap-1"><CheckCircle size={14} /> Approve Evidence</span>
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "uploads" && (
        <div className="space-y-4">
          <form onSubmit={uploadForensicFile} className="bg-white border border-slate-200 rounded-sm p-6 space-y-3">
            <div className="font-display font-bold">Upload Forensic Artifact</div>
            {!selected && <div className="text-sm text-slate-500">Select a case from the Cases tab first.</div>}
            <input
              value={forensicDesc}
              onChange={(e) => setForensicDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
            <input
              type="file"
              onChange={(e) => setForensicFile(e.target.files?.[0] || null)}
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm"
            />
            <div className="flex justify-end">
              <button
                disabled={uploadingForensicFile || !selected}
                className="btn-primary px-5 py-2 text-sm font-semibold rounded-sm disabled:opacity-60 flex items-center gap-2"
              >
                <Upload size={14} /> {uploadingForensicFile ? "Uploading…" : "Upload Artifact"}
              </button>
            </div>
          </form>

          <div className="bg-white border border-slate-200 rounded-sm p-6">
            <div className="font-display font-bold mb-4">Uploaded Forensic Artifacts</div>
            {!selected ? (
              <div className="text-sm text-slate-500">Select a case from the Cases tab first.</div>
            ) : (selected.forensic_uploads || []).length === 0 ? (
              <div className="text-sm text-slate-500">No forensic artifacts uploaded for this case yet.</div>
            ) : (
              <div className="space-y-3">
                {(selected.forensic_uploads || []).map((u) => (
                  <div key={u.upload_id} className="border border-slate-200 rounded-sm p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-mono text-[#0033A0]">{u.upload_id}</div>
                        <div className="text-sm font-semibold">{u.original_filename}</div>
                        <div className="text-xs text-slate-500 mt-1">{u.description || "—"}</div>
                      </div>
                      <div className="text-xs text-slate-500">
                        <div>{u.uploaded_by}</div>
                        <div className="font-mono">{u.uploaded_at?.slice(0, 10)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
                      <div>
                        <div className="micro-label">SHA-256</div>
                        <div className="font-mono text-[11px] break-all">{u.sha256_hash}</div>
                      </div>
                      <div>
                        <div className="micro-label">CID</div>
                        <div className="font-mono text-[11px] break-all">{u.cid || "None"}</div>
                      </div>
                      <div>
                        <div className="micro-label">IPFS</div>
                        <div className={`${u.ipfs_status === "online" ? "text-green-700" : u.ipfs_status === "failed" ? "text-red-700" : "text-yellow-600"}`}>
                          {u.ipfs_status || "offline"}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {u.cid && (
                        <button
                          type="button"
                          onClick={() => openFromIpfs(u.cid)}
                          className="btn-secondary text-xs font-semibold px-3 py-1 rounded-sm"
                        >
                          <span className="inline-flex items-center gap-1"><Eye size={14} /> View IPFS</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="font-display font-bold">Forensic Report Template</div>
                <div className="text-sm text-slate-500 mt-1">Download the official sample format before preparing the final report.</div>
              </div>
              <button
                type="button"
                onClick={downloadReportTemplate}
                className="btn-secondary px-4 py-2 rounded-sm text-sm font-semibold inline-flex items-center gap-2"
              >
                <Download size={14} /> Download Sample Forensic Report
              </button>
            </div>
          </div>

          <form onSubmit={uploadReport} className="bg-white border border-slate-200 rounded-sm p-6 space-y-3">
            <div className="font-display font-bold">Structured Forensic Report (System Entry)</div>
            {!selected && (
              <div className="text-sm text-slate-500">Select a case from the Cases tab first.</div>
            )}
            <input
              required
              value={report.report_title}
              onChange={(e) => setReport((s) => ({ ...s, report_title: e.target.value }))}
              placeholder="Report title"
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
            <textarea
              required
              rows={3}
              value={report.summary}
              onChange={(e) => setReport((s) => ({ ...s, summary: e.target.value }))}
              placeholder="Forensic summary report"
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              value={report.examiner_name}
              onChange={(e) => setReport((s) => ({ ...s, examiner_name: e.target.value }))}
              placeholder="Examiner name"
              className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
            <input
              value={report.lab_name}
              onChange={(e) => setReport((s) => ({ ...s, lab_name: e.target.value }))}
              placeholder="Lab name"
              className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
            <input
              value={report.verified_evidence_ids}
              onChange={(e) => setReport((s) => ({ ...s, verified_evidence_ids: e.target.value }))}
              placeholder="Verified evidence IDs (comma separated)"
              className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
            <input
              value={report.matching_hashes}
              onChange={(e) => setReport((s) => ({ ...s, matching_hashes: e.target.value }))}
              placeholder="Matching hashes (comma separated)"
              className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <textarea
              rows={2}
              value={report.image_analysis}
              onChange={(e) => setReport((s) => ({ ...s, image_analysis: e.target.value }))}
              placeholder="Image analysis"
              className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
            <textarea
              rows={2}
              value={report.log_analysis}
              onChange={(e) => setReport((s) => ({ ...s, log_analysis: e.target.value }))}
              placeholder="Log analysis"
              className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
            <textarea
              rows={2}
              value={report.ip_analysis}
              onChange={(e) => setReport((s) => ({ ...s, ip_analysis: e.target.value }))}
              placeholder="IP analysis"
              className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
            <textarea
              rows={2}
              value={report.call_data_analysis}
              onChange={(e) => setReport((s) => ({ ...s, call_data_analysis: e.target.value }))}
              placeholder="Call data analysis"
              className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
            <textarea
              rows={2}
              value={report.ai_tampering_analysis}
              onChange={(e) => setReport((s) => ({ ...s, ai_tampering_analysis: e.target.value }))}
              placeholder="AI tampering analysis"
              className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
            <textarea
              rows={2}
              value={report.final_conclusion}
              onChange={(e) => setReport((s) => ({ ...s, final_conclusion: e.target.value }))}
              placeholder="Final conclusion"
              className="border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
          </div>
          <input
            value={report.digital_signature}
            onChange={(e) => setReport((s) => ({ ...s, digital_signature: e.target.value }))}
            placeholder="Digital signature / signature hash"
            className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
          />
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <select
              value={report.result}
              onChange={(e) => setReport((s) => ({ ...s, result: e.target.value }))}
              className="border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            >
              <option>Verified</option>
              <option>Suspicious</option>
            </select>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={report.send_to_court}
                onChange={(e) => setReport((s) => ({ ...s, send_to_court: e.target.checked }))}
              />
              Send results to Court module
            </label>
          </div>
            <div className="flex justify-end">
              <button className="btn-primary px-5 py-2 text-sm font-semibold rounded-sm flex items-center gap-2">
                <Fingerprint size={14} /> Upload Report
              </button>
            </div>
          </form>

          <form onSubmit={uploadCompletedReport} className="bg-white border border-slate-200 rounded-sm p-6 space-y-3">
            <div className="font-display font-bold">Upload Completed Signed Report File</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={completedReportDesc}
                onChange={(e) => setCompletedReportDesc(e.target.value)}
                placeholder="Description (optional)"
                className="md:col-span-2 border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
              />
              <input
                type="file"
                onChange={(e) => setCompletedReportFile(e.target.files?.[0] || null)}
                className="border border-slate-300 px-3 py-2 text-sm rounded-sm"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!selected || !completedReportFile || uploadingCompletedReport}
                className="btn-primary px-5 py-2 text-sm font-semibold rounded-sm disabled:opacity-60 inline-flex items-center gap-2"
              >
                <Upload size={14} /> {uploadingCompletedReport ? "Uploading..." : "Upload Completed Report"}
              </button>
            </div>
          </form>

          <div className="bg-white border border-slate-200 rounded-sm p-6">
            <div className="font-display font-bold mb-4">Completed Report Files</div>
            {!selected ? (
              <div className="text-sm text-slate-500">Select a case from the Cases tab first.</div>
            ) : (selected.report_files || []).length === 0 ? (
              <div className="text-sm text-slate-500">No completed report files uploaded yet.</div>
            ) : (
              <div className="space-y-3">
                {(selected.report_files || []).map((r) => (
                  <div key={r.report_file_id} className="border border-slate-200 rounded-sm p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="text-xs font-mono text-[#0033A0]">{r.report_file_id}</div>
                        <div className="text-sm font-semibold">{r.original_filename}</div>
                        <div className="text-xs text-slate-500 mt-1">{r.description || "Completed forensic report"}</div>
                      </div>
                      <div className="text-xs text-slate-500">
                        <div>{r.uploaded_by}</div>
                        <div className="font-mono">{r.uploaded_at}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
                      <div><span className="micro-label">Hash</span><div className="font-mono text-[11px] break-all">{r.sha256_hash}</div></div>
                      <div><span className="micro-label">CID</span><div className="font-mono text-[11px] break-all">{r.cid || "No CID"}</div></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/forensic/reports/${r.report_file_id}/download`, "_blank")} className="btn-secondary px-3 py-1 rounded-sm text-xs font-semibold inline-flex items-center gap-1">
                        <Download size={13} /> Download
                      </button>
                      <button type="button" onClick={async () => {
                        try {
                          const { data } = await api.get(`/forensic/reports/${r.report_file_id}/verify-hash`);
                          toast[data.ok ? "success" : "error"](data.message);
                          await load();
                        } catch (e) {
                          toast.error(formatApiError(e.response?.data?.detail) || e.message);
                        }
                      }} className="btn-primary px-3 py-1 rounded-sm text-xs font-semibold inline-flex items-center gap-1">
                        <ShieldCheck size={13} /> Verify Hash
                      </button>
                      <button type="button" onClick={async () => {
                        try {
                          const { data } = await api.get(`/forensic/reports/${r.report_file_id}/verify-cid`);
                          toast[data.ok ? "success" : "error"](data.message);
                          await load();
                        } catch (e) {
                          toast.error(formatApiError(e.response?.data?.detail) || e.message);
                        }
                      }} className="btn-secondary px-3 py-1 rounded-sm text-xs font-semibold inline-flex items-center gap-1">
                        <Link2 size={13} /> Verify CID
                      </button>
                      {r.cid && (
                        <button type="button" onClick={() => openFromIpfs(r.cid)} className="btn-secondary px-3 py-1 rounded-sm text-xs font-semibold inline-flex items-center gap-1">
                          <Eye size={13} /> Open IPFS
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "blockchain" && (
        <div className="bg-white border border-slate-200 rounded-sm p-6">
          <div className="font-display font-bold mb-4">Blockchain Validation</div>
          {!selected ? (
            <div className="text-sm text-slate-500">Select a case from the Cases tab first.</div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-slate-600">
                Blockchain integrity ensures that evidence cannot be tampered with after upload.
                Each evidence item is linked to a blockchain block for permanent verification.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-sm border border-slate-200 p-3">
                  <div className="micro-label">Total Evidence Blocks</div>
                  <div className="text-xl font-black mt-2">{chainSummary.total}</div>
                  <div className="text-xs text-slate-500 mt-1">Evidence with block index: {chainSummary.withBlock}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-3">
                  <div className="micro-label">Chain Status</div>
                  <div className={`text-xl font-black mt-2 ${chainSummary.invalid > 0 ? "text-red-700" : chainSummary.unknown > 0 ? "text-yellow-600" : "text-green-700"}`}>
                    {chainSummary.invalid > 0 ? "INVALID" : chainSummary.unknown > 0 ? "PARTIAL" : "VALID"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {chainSummary.invalid > 0
                      ? `${chainSummary.invalid} block(s) failing validation`
                      : chainSummary.unknown > 0
                        ? `${chainSummary.unknown} block(s) pending/unknown`
                        : "All blocks verified"}
                  </div>
                </div>
                <div className="rounded-sm border border-slate-200 p-3">
                  <div className="micro-label">CID Coverage</div>
                  <div className="text-xl font-black mt-2">{chainSummary.withCid}/{chainSummary.total}</div>
                  <div className="text-xs text-slate-500 mt-1">Evidence with CID (IPFS link)</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-3">
                  <div className="micro-label">Approvals (Total)</div>
                  <div className="text-xl font-black mt-2">{chainSummary.approvals}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Latest block index: {chainSummary.maxBlockIndex >= 0 ? `#${chainSummary.maxBlockIndex}` : "—"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
