import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { openIpfsUrl } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Clock, FileText, ShieldCheck, ShieldAlert, Scale } from "lucide-react";

const STATUSES = [
  "Approved", "Under Investigation", "Evidence Collected",
  "Forensic Review", "Sent to Court", "Hearing Scheduled",
  "Judgment Issued", "Closed", "Rejected",
];

function getFlowStatus(status) {
  if (["FIR Registered", "Approved", "Rejected"].includes(status)) return "FIR Filed";
  if (["Under Investigation", "Evidence Collected"].includes(status)) return "Under Investigation";
  if (["Forensic Review", "Sent to Forensic Review", "Forensic Review Completed"].includes(status)) return "Forensic Review";
  if (status === "Sent to Court") return "Ready for Court";
  if (["Hearing Scheduled", "Judgment Issued", "Closed"].includes(status)) return "In Court";
  return "FIR Filed";
}

export default function FIRDetail() {
  const { firId } = useParams();
  const { user } = useAuth();
  const [fir, setFir] = useState(null);
  const [newStatus, setNewStatus] = useState("Approved");
  const [note, setNote] = useState("");
  const [assignedInvestigatorName, setAssignedInvestigatorName] = useState("");
  const [linkedCaseId, setLinkedCaseId] = useState("");
  const [linkedCase, setLinkedCase] = useState(null);
  const [appealReason, setAppealReason] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [officers, setOfficers] = useState([]);
  const [assignedOfficerId, setAssignedOfficerId] = useState("");
  const [investigators, setInvestigators] = useState([]);
  const [assignedInvestigatorId, setAssignedInvestigatorId] = useState("");
  const [forwarding, setForwarding] = useState(false);
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyCID, setVerifyCID] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);

  const load = async () => {
    try {
      const [firRes, casesRes] = await Promise.all([
        api.get(`/firs/${firId}`),
        api.get("/cases"),
      ]);

      setFir(firRes.data);
      setNewStatus(firRes.data?.status || "Approved");

      const linkedCase = (casesRes.data || []).find((c) => c.fir_id === firId);
      setAssignedInvestigatorName(linkedCase?.assigned_investigator_name || "");
      setLinkedCaseId(linkedCase?.case_id || "");
      setLinkedCase(linkedCase || null);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  useEffect(() => {
    if (firId) load();
  }, [firId]);

  useEffect(() => {
    if (!firId) return;
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
  }, [firId]);

  useEffect(() => {
    if (!["police", "admin"].includes(user?.role)) return;
    api
      .get("/officers")
      .then(({ data }) => setOfficers(data || []))
      .catch(() => {});
    api
      .get("/investigator/list")
      .then(({ data }) => {
        setInvestigators(data || []);
        if ((data || []).length > 0) {
          setAssignedInvestigatorId((prev) => prev || data[0].id);
        }
      })
      .catch(() => {});
  }, [user?.role]);

  const updateStatus = async () => {
    try {
      const payload = { status: newStatus, note };
      if (assignedOfficerId) payload.assigned_officer_id = assignedOfficerId;
      await api.patch(`/firs/${firId}/status`, payload);
      toast.success(`Status updated → ${newStatus}`);
      setNote("");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const forwardToInvestigator = async () => {
    if (!assignedInvestigatorId) return;
    setForwarding(true);
    try {
      let caseId = linkedCaseId;
      if (!caseId) {
        const created = await api.post("/cases", {
          fir_id: firId,
          title: `${fir.crime_type} Case`,
          summary: fir.description || "",
        });
        caseId = created.data?.case_id || "";
      }

      await api.patch(`/firs/${firId}/assign-investigator`, {
        investigator_id: assignedInvestigatorId,
        note: "Forwarded by police to investigator",
      });
      await api.patch(`/firs/${firId}/status`, {
        status: "Under Investigation",
        note: "Forwarded to investigator",
      });

      toast.success("FIR forwarded to investigator");
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setForwarding(false);
    }
  };

  const verifyDocumentHash = async () => {
    if (!verifyHash.trim()) return;
    try {
      const { data } = await api.post("/verify/hash", { hash: verifyHash.trim() });
      setVerificationResult(data);
      if (data.verified) {
        toast.success("Hash verified successfully");
      } else {
        toast.error("Hash verification failed");
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const verifyDocumentCID = async () => {
    if (!verifyCID.trim()) return;
    try {
      const { data } = await api.post("/verify/cid", { cid: verifyCID.trim() });
      setVerificationResult(data);
      if (data.verified) {
        toast.success("CID verified successfully");
      } else {
        toast.error("CID verification failed");
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  if (!fir) return <div className="micro-label">Loading…</div>;

  const canManage = user?.role === "police";
  const canVerify = ["investigator", "forensic", "court_officer", "judge"].includes(user?.role);
  const hasVerifiableDocuments = (fir.documents || []).some(
    (doc) => Boolean(doc?.sha256_hash && doc?.cid && doc?.block_index !== null && doc?.block_index !== undefined)
  );

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

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 items-start">
        <div className="w-full bg-white border border-slate-200 rounded-sm p-6">
          <div className="mb-4">
            <div className="micro-label">Description</div>
            <div className="text-sm mt-2 leading-relaxed whitespace-pre-wrap">
              {fir.description}
            </div>
          </div>

          {/* Supporting Documents */}
          {(fir.documents || []).length > 0 && (
            <div className="mb-4">
              <div className="micro-label">Supporting Documents</div>
              <div className="mt-2 space-y-2">
                {fir.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-sm px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-slate-500" />
                      <div>
                        <div className="text-sm font-medium">{doc.filename}</div>
                        <div className="text-xs text-slate-500">
                          {doc.file_type} • {(doc.sha256_hash || "").slice(0, 16)}... • {doc.uploaded_at?.slice(0, 10)}
                        </div>
                        {doc.cid && (
                          <div className="text-xs text-slate-500 font-mono space-y-1">
                            <div>CID: {doc.cid.slice(0, 20)}...</div>
                            <button
                              type="button"
                              onClick={async () => {
                                const { ok, error } = await openIpfsUrl(doc.cid, null);
                                if (!ok) toast.error(error || "IPFS content temporarily unavailable");
                              }}
                              className="text-[10px] font-semibold text-[#0033A0] hover:underline"
                            >
                              Open from IPFS
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      by {doc.uploaded_by}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification Panel for privileged users */}
          {canVerify && hasVerifiableDocuments && (
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-sm">
              <div className="micro-label mb-3">Document Verification</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <input
                    type="text"
                    placeholder="Enter SHA-256 hash to verify"
                    value={verifyHash}
                    onChange={(e) => setVerifyHash(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  />
                  <button
                    onClick={verifyDocumentHash}
                    className="mt-2 bg-[#0033A0] text-white px-3 py-1.5 text-sm font-semibold rounded-sm hover:bg-[#002370]"
                  >
                    Verify Hash
                  </button>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Enter IPFS CID to verify"
                    value={verifyCID}
                    onChange={(e) => setVerifyCID(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                  />
                  <button
                    onClick={verifyDocumentCID}
                    className="mt-2 bg-[#0033A0] text-white px-3 py-1.5 text-sm font-semibold rounded-sm hover:bg-[#002370]"
                  >
                    Verify CID
                  </button>
                </div>
              </div>
              {verificationResult && (
                <div className={`p-3 rounded-sm text-sm ${verificationResult.verified ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {verificationResult.verified ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                    <span className="font-semibold">
                      {verificationResult.verified ? "VERIFIED AUTHENTIC" : "TAMPER DETECTED"}
                    </span>
                  </div>
                  <div>{verificationResult.message}</div>
                  {verificationResult.verified && (
                    <div className="mt-2 text-xs space-y-1">
                      <div>Type: {verificationResult.type}</div>
                      <div>FIR: {verificationResult.fir_id || verificationResult.evidence_id}</div>
                      <div>File: {verificationResult.filename}</div>
                      {verificationResult.cid && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span>CID: {verificationResult.cid}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              const { ok, error } = await openIpfsUrl(verificationResult.cid, null);
                              if (!ok) toast.error(error || "IPFS content temporarily unavailable");
                            }}
                            className="text-[10px] font-semibold text-[#0033A0] hover:underline"
                          >
                            Open CID
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {canVerify && !hasVerifiableDocuments && (
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-sm text-sm text-slate-600">
              FIR citizen attachments do not yet have complete blockchain/IPFS metadata. Verification controls are hidden until hash, CID, and blockchain record are available.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 mb-4">
            <div>
              <div className="micro-label">Current Status</div>
              <div className="mt-1 inline-block px-2 py-1 text-xs font-semibold uppercase bg-[#0033A0] text-white rounded-sm">
                {fir.status === "Closed" ? "CASE CLOSED" : fir.status}
              </div>
              <div className="text-xs text-slate-500 mt-2">Flow Status: {getFlowStatus(fir.status)}</div>
            </div>

            <div>
              <div className="micro-label">Assigned Officer</div>
              <div className="text-sm mt-1">{fir.assigned_officer_name || "— unassigned —"}</div>
            </div>

            <div>
              <div className="micro-label">Assigned Investigator</div>
              <div className="text-sm mt-1">{assignedInvestigatorName || "Not Assigned Yet"}</div>
            </div>
          </div>

          {linkedCaseId && (
            <div className="mb-4 pt-4 border-t border-slate-200 text-sm">
              <div className="micro-label">Linked criminal case</div>
              <div className="font-mono text-xs text-[#0033A0] mt-1">{linkedCaseId}</div>
              {linkedCase && (
                <div className="text-xs text-slate-600 mt-1">
                  Case status: <span className="font-semibold">{linkedCase.status}</span>
                  {linkedCase.appeal_status ? (
                    <span>
                      {" "}
                      · Appeal: <span className="font-semibold">{linkedCase.appeal_status}</span>
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {user?.role === "citizen" && linkedCase?.case_id && linkedCase.appeal_status === "Pending" && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-sm text-sm text-amber-900 flex gap-2 items-start">
              <Scale size={18} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Appeal submitted</div>
                <div className="text-xs mt-1">Your appeal for this case is awaiting review by the court.</div>
              </div>
            </div>
          )}

          {user?.role === "citizen" &&
            linkedCase?.case_id &&
            ["Closed", "Judgment Issued", "Rejected"].includes(linkedCase.status) &&
            linkedCase.appeal_status !== "Pending" && (
              <div className="mb-4 p-4 border border-amber-300 bg-amber-50 rounded-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Scale size={18} className="text-amber-700" />
                  <div className="font-display font-bold text-amber-900">Higher court appeal</div>
                </div>
                <p className="text-xs text-amber-800">
                  Request a formal review when the linked case has been closed or a judgment has been issued, and no appeal
                  is already pending.
                </p>
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
                      const { data } = await api.post(`/cases/${linkedCase.case_id}/appeal`, {
                        reason: appealReason.trim(),
                      });
                      toast.success(`Appeal filed (${data.appeal_id})`);
                      setAppealReason("");
                      await load();
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

          {canManage && (
            <div className="pt-4 border-t border-slate-200 space-y-3 mb-4">
              <div className="micro-label">Update Status</div>
              <div className="flex flex-wrap gap-[10px] items-start">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="flex-1 min-w-[220px] border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>

                <input
                  placeholder="Note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex-1 min-w-[220px] border border-slate-300 px-3 py-2 text-sm rounded-sm"
                />

                <select
                  value={assignedOfficerId}
                  onChange={(e) => setAssignedOfficerId(e.target.value)}
                  className="flex-1 min-w-[220px] border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm"
                >
                  <option value="">Assign officer (optional)</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.email})
                    </option>
                  ))}
                </select>

                <button
                  onClick={updateStatus}
                  className="bg-[#0033A0] text-white px-4 py-2 text-sm font-semibold rounded-sm shrink-0"
                >
                  Update
                </button>
              </div>
            </div>
          )}

          {canManage && (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="micro-label">Forward FIR to Investigator</div>
              {investigators.length === 0 ? (
                <div className="text-sm text-slate-500">No investigators available.</div>
              ) : (
                <div className="flex flex-wrap gap-[10px] items-start">
                  <select
                    value={assignedInvestigatorId}
                    onChange={(e) => setAssignedInvestigatorId(e.target.value)}
                    className="flex-1 min-w-[220px] border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm"
                  >
                    {investigators.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.email})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={forwardToInvestigator}
                    disabled={forwarding || !assignedInvestigatorId}
                    className="bg-[#0033A0] text-white px-4 py-2 text-sm font-semibold rounded-sm disabled:opacity-60 shrink-0"
                  >
                    {forwarding ? "Forwarding..." : "Forward to Next Stage"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="min-w-[280px] max-w-[350px] w-full bg-white border border-slate-200 rounded-sm p-6">
          <div className="font-display font-bold mb-4">Timeline</div>

          <div className="space-y-4">
            {(fir.status_history || []).map((h, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 bg-[#0033A0] text-white flex items-center justify-center rounded-sm">
                  {i === fir.status_history.length - 1 ? (
                    <Clock size={12} />
                  ) : (
                    <CheckCircle2 size={12} />
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold">{h.status}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {h.at?.slice(0, 19).replace("T", " ")}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">by {h.by}</div>
                  {h.note && (
                    <div className="text-xs italic mt-1">"{h.note}"</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}