import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { UserCheck, Flag, Users, Upload, ShieldCheck, Link2, Eye, Download, Plus, X } from "lucide-react";
import Evidence from "@/pages/Evidence";

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

export default function Investigator() {
  const [assigned, setAssigned] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [evidenceByCase, setEvidenceByCase] = useState({});
  const [suspectsByCase, setSuspectsByCase] = useState({});
  const [witnessesByCase, setWitnessesByCase] = useState({});
  const [forwarding, setForwarding] = useState(false);
  const [forwardNote, setForwardNote] = useState("");
  const [allSuspects, setAllSuspects] = useState([]);
  const [overviewStats, setOverviewStats] = useState(null);
  
  // Witness form state
  const [showWitnessForm, setShowWitnessForm] = useState(false);
  const [editingWitness, setEditingWitness] = useState(null);
  const [witnessName, setWitnessName] = useState("");
  const [witnessContact, setWitnessContact] = useState("");
  const [witnessStatement, setWitnessStatement] = useState("");
  const [witnessProtected, setWitnessProtected] = useState(false);
  const [witnessConfidential, setWitnessConfidential] = useState(false);
  const [witnessSubmitting, setWitnessSubmitting] = useState(false);
  const [witnessFile, setWitnessFile] = useState(null);
  const [witnessFileDescription, setWitnessFileDescription] = useState("");
  const [witnessFileUploading, setWitnessFileUploading] = useState(false);
  const [verifyHashInput, setVerifyHashInput] = useState("");
  const [verifyCidInput, setVerifyCidInput] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);

  const loadAssignedCases = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/investigator/cases");
      const rows = data || [];
      setAssigned(rows);
      const nextId = rows.length > 0 ? (selectedCaseId || rows[0].case.case_id) : "";
      setSelectedCaseId(nextId);

      // Load all suspects to filter by case
      const { data: suspectsData } = await api.get("/suspects");
      setAllSuspects(suspectsData || []);

      if (rows.length > 0) {
        const evidenceEntries = await Promise.all(
          rows.map(async (row) => {
            try {
              const res = await api.get("/evidence", { params: { case_id: row.case.case_id } });
              return [row.case.case_id, res.data || []];
            } catch {
              return [row.case.case_id, []];
            }
          })
        );
        setEvidenceByCase(Object.fromEntries(evidenceEntries));
        
        // Build suspects by case map
        const suspectsMap = {};
        rows.forEach((row) => {
          suspectsMap[row.case.case_id] = (suspectsData || []).filter(
            (s) => s.associated_cases?.includes(row.case.case_id)
          );
        });
        setSuspectsByCase(suspectsMap);
        
        // Load witnesses for each case
        const witnessEntries = await Promise.all(
          rows.map(async (row) => {
            try {
              const res = await api.get("/witnesses", { params: { case_id: row.case.case_id } });
              return [row.case.case_id, res.data?.witnesses || []];
            } catch {
              return [row.case.case_id, []];
            }
          })
        );
        setWitnessesByCase(Object.fromEntries(witnessEntries));
      } else {
        setEvidenceByCase({});
        setSuspectsByCase({});
        setWitnessesByCase({});
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignedCases();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      loadAssignedCases();
    }, 20000);
    const onVis = () => {
      if (document.visibilityState === "visible") loadAssignedCases();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
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

  const selected = useMemo(
    () => assigned.find((item) => item.case.case_id === selectedCaseId) || null,
    [assigned, selectedCaseId]
  );

  const selectedEvidence = selected ? evidenceByCase[selected.case.case_id] || [] : [];
  const selectedSuspects = selected ? suspectsByCase[selected.case.case_id] || [] : [];
  const selectedWitnesses = selected ? witnessesByCase[selected.case.case_id] || [] : [];
  const hasEvidence = selectedEvidence.length > 0;

  // Witness CRUD functions
  const loadWitnessesForCase = async (caseId) => {
    try {
      const { data } = await api.get("/witnesses", { params: { case_id: caseId } });
      setWitnessesByCase((prev) => ({ ...prev, [caseId]: data?.witnesses || [] }));
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const openWitnessForm = (witness = null) => {
    if (witness) {
      setEditingWitness(witness);
      setWitnessName(witness.name);
      setWitnessContact(witness.contact_info || "");
      setWitnessStatement(witness.statement);
      setWitnessProtected(witness.is_protected);
      setWitnessConfidential(witness.is_confidential);
    } else {
      setEditingWitness(null);
      setWitnessName("");
      setWitnessContact("");
      setWitnessStatement("");
      setWitnessProtected(false);
      setWitnessConfidential(false);
    }
    setShowWitnessForm(true);
  };

  const closeWitnessForm = () => {
    setShowWitnessForm(false);
    setEditingWitness(null);
    setWitnessName("");
    setWitnessContact("");
    setWitnessStatement("");
    setWitnessProtected(false);
    setWitnessConfidential(false);
  };

  const saveWitness = async (e) => {
    e.preventDefault();
    if (!selected || !witnessName.trim() || !witnessStatement.trim()) {
      toast.error("Name and statement are required");
      return;
    }
    setWitnessSubmitting(true);
    try {
      if (editingWitness) {
        await api.put(`/witnesses/${editingWitness.witness_id}`, {
          name: witnessName.trim(),
          contact_info: witnessContact.trim(),
          statement: witnessStatement.trim(),
          is_protected: witnessProtected,
          is_confidential: witnessConfidential,
        });
        toast.success("Witness updated");
      } else {
        await api.post("/witnesses", {
          case_id: selected.case.case_id,
          name: witnessName.trim(),
          contact_info: witnessContact.trim(),
          statement: witnessStatement.trim(),
          is_protected: witnessProtected,
          is_confidential: witnessConfidential,
        });
        toast.success("Witness added");
      }
      closeWitnessForm();
      await loadWitnessesForCase(selected.case.case_id);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setWitnessSubmitting(false);
    }
  };

  const deleteWitness = async (witnessId) => {
    if (!confirm("Are you sure you want to delete this witness?")) return;
    try {
      await api.delete(`/witnesses/${witnessId}`);
      toast.success("Witness deleted");
      await loadWitnessesForCase(selected.case.case_id);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const uploadWitnessDocument = async (witnessId) => {
    if (!witnessFile) {
      toast.error("Please select a file");
      return;
    }
    setWitnessFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", witnessFile);
      formData.append("description", witnessFileDescription.trim());
      await api.post(`/witnesses/${witnessId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Document uploaded with hash and CID");
      setWitnessFile(null);
      setWitnessFileDescription("");
      await loadWitnessesForCase(selected.case.case_id);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setWitnessFileUploading(false);
    }
  };

  const verifyWitness = async (witnessId) => {
    if (!verifyHashInput.trim() && !verifyCidInput.trim()) {
      toast.error("Enter hash or CID to verify");
      return;
    }
    try {
      const { data } = await api.post(`/witnesses/${witnessId}/verify`, {
        witness_id: witnessId,
        hash: verifyHashInput.trim() || undefined,
        cid: verifyCidInput.trim() || undefined,
      });
      setVerifyResult(data);
      toast[data.verified ? "success" : "error"](data.message);
      await loadWitnessesForCase(selected.case.case_id);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const forwardWitnessToCourt = async (witnessId) => {
    try {
      await api.post(`/witnesses/${witnessId}/forward`, { note: "Forwarded by investigator" });
      toast.success("Witness forwarded to court");
      await loadWitnessesForCase(selected.case.case_id);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const forwardToForensic = async () => {
    if (!selected || !hasEvidence) return;
    setForwarding(true);
    try {
      await api.patch(`/cases/${selected.case.case_id}/status`, {
        status: "forwarded_to_forensic",
        forwarded_to: "forensic",
        remarks: (forwardNote || "").trim(),
      });
      toast.success("Case forwarded to Forensic");
      setForwardNote("");
      await loadAssignedCases();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setForwarding(false);
    }
  };

  const forwardToCourt = async () => {
    if (!selected || !hasEvidence) return;
    setForwarding(true);
    try {
      await api.patch(`/cases/${selected.case.case_id}/status`, {
        status: "forwarded_to_court",
        forwarded_to: "court",
        remarks: (forwardNote || "").trim(),
      });
      toast.success("Case forwarded to Court");
      setForwardNote("");
      await loadAssignedCases();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setForwarding(false);
    }
  };

  const markSuspectAsAccused = async (suspectId) => {
    if (!selected) return;
    try {
      await api.post(`/suspects/${suspectId}/mark-accused`, {
        case_id: selected.case.case_id,
        note: "Marked as accused from Investigator dashboard",
      });
      toast.success("Suspect marked as accused");
      await loadAssignedCases();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2">Investigator Module</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">Investigator Dashboard</h1>
        <p className="text-sm text-slate-600 mt-2">Upload evidence and forward cases to next stage.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Total FIRs", value: overviewStats?.total_firs },
          { label: "Open cases", value: overviewStats?.open_cases },
          { label: "Evidence", value: overviewStats?.total_evidence },
          { label: "Suspects", value: overviewStats?.total_suspects },
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
          <div className="px-4 py-3 border-b border-slate-200 micro-label">Assigned Cases</div>
          {loading ? (
            <div className="px-4 py-6 text-sm text-slate-500">Loading assigned cases...</div>
          ) : assigned.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">No assigned cases available.</div>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              {assigned.map((item) => (
                <button
                  key={item.case.case_id}
                  onClick={() => setSelectedCaseId(item.case.case_id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover-neon ${
                    selectedCaseId === item.case.case_id ? "bg-slate-50" : ""
                  }`}
                >
                  <div className="text-xs font-mono text-[#0033A0]">{item.case.case_id}</div>
                  <div className="text-sm font-semibold mt-1">{item.case.title || item.case.crime_type}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Status: {getFlowStatus(item.case)} ({item.case.status})
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="bg-white border border-slate-200 rounded-sm p-6 text-sm text-slate-500">
              No cases available.
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-sm p-6">
                <div className="micro-label font-mono">{selected.case.case_id}</div>
                <h2 className="font-display text-2xl font-black tracking-tight mt-1">
                  {selected.case.title || selected.case.crime_type}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Current Status: {selected.case.status} · Flow Status: {getFlowStatus(selected.case)}
                </p>
                <p className="text-sm text-slate-600 mt-1">Evidence uploaded: {selectedEvidence.length}</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-3">
                <div className="font-display font-bold">Associated Suspects</div>
                {selectedSuspects.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    No suspects linked to this case. Link suspects from the <strong>Suspects</strong> page.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedSuspects.map((suspect) => (
                      <div key={suspect.suspect_id} className="flex items-center justify-between gap-3 p-3 border border-slate-200 rounded-sm bg-slate-50">
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{suspect.name}</div>
                          <div className="text-xs text-slate-500">{suspect.suspect_id} · {suspect.cnic || "No CNIC"}</div>
                          <div className="text-xs mt-1 space-x-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${suspect.is_accused ? "bg-red-50 text-red-700 border-red-300" : "bg-blue-50 text-blue-700 border-blue-300"}`}>
                              {suspect.is_accused ? "Accused" : "Suspect"}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${suspect.risk_level === "high" ? "bg-red-50 text-red-700 border-red-300" : suspect.risk_level === "medium" ? "bg-yellow-50 text-yellow-700 border-yellow-300" : "bg-green-50 text-green-700 border-green-300"}`}>
                              {suspect.risk_level} Risk
                            </span>
                          </div>
                        </div>
                        {!suspect.is_accused && (
                          <button
                            onClick={() => markSuspectAsAccused(suspect.suspect_id)}
                            className="btn-danger text-xs font-semibold px-3 py-2 rounded-sm flex items-center gap-2"
                          >
                            <Flag size={14} /> Mark Accused
                          </button>
                        )}
                        {suspect.is_accused && (
                          <div className="text-xs font-semibold text-red-700 px-3 py-2">
                            <span className="inline-flex items-center gap-1"><UserCheck size={14} /> Accused</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-display font-bold">Witnesses</div>
                  <button
                    onClick={() => openWitnessForm()}
                    className="bg-[#0033A0] text-white px-3 py-1.5 text-xs font-semibold rounded-sm hover:bg-[#002370] flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Witness
                  </button>
                </div>
                {selectedWitnesses.length === 0 ? (
                  <div className="text-sm text-slate-500">No witnesses for this case.</div>
                ) : (
                  <div className="space-y-3">
                    {selectedWitnesses.map((witness) => (
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
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openWitnessForm(witness)}
                              className="text-xs font-semibold px-2 py-1 rounded-sm border border-slate-300 hover:bg-slate-100"
                              disabled={witness.verification_status === "verified"}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteWitness(witness.witness_id)}
                              className="text-xs font-semibold px-2 py-1 rounded-sm border border-red-300 text-red-700 hover:bg-red-50"
                              disabled={witness.verification_status === "verified"}
                            >
                              Delete
                            </button>
                          </div>
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
                        
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setWitnessFile(null);
                              setWitnessFileDescription("");
                              document.getElementById(`witness-file-${witness.witness_id}`).click();
                            }}
                            className="text-xs px-2 py-1 rounded-sm border border-slate-300 hover:bg-slate-100 flex items-center gap-1"
                          >
                            <Upload size={12} /> Upload Document
                          </button>
                          <input
                            id={`witness-file-${witness.witness_id}`}
                            type="file"
                            className="hidden"
                            onChange={(e) => setWitnessFile(e.target.files?.[0] || null)}
                          />
                          <button
                            onClick={() => forwardWitnessToCourt(witness.witness_id)}
                            disabled={witness.forwarded_to_court}
                            className="text-xs px-2 py-1 rounded-sm border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50"
                          >
                            {witness.forwarded_to_court ? "Forwarded" : "Forward to Court"}
                          </button>
                        </div>
                        
                        {witnessFile && (
                          <div className="mt-2">
                            <input
                              value={witnessFileDescription}
                              onChange={(e) => setWitnessFileDescription(e.target.value)}
                              placeholder="Document description (optional)"
                              className="w-full border border-slate-300 px-2 py-1 text-xs rounded-sm"
                            />
                            <button
                              onClick={() => uploadWitnessDocument(witness.witness_id)}
                              disabled={witnessFileUploading}
                              className="mt-1 text-xs px-2 py-1 rounded-sm bg-[#0033A0] text-white hover:bg-[#002370] disabled:opacity-50"
                            >
                              {witnessFileUploading ? "Uploading..." : "Upload"}
                            </button>
                            <button
                              onClick={() => { setWitnessFile(null); setWitnessFileDescription(""); }}
                              className="mt-1 ml-1 text-xs px-2 py-1 rounded-sm border border-slate-300 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {showWitnessForm && (
                <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-display font-bold">{editingWitness ? "Edit Witness" : "Add Witness"}</div>
                    <button onClick={closeWitnessForm} className="text-slate-500 hover:text-slate-700">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={saveWitness} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Name *</label>
                      <input
                        value={witnessName}
                        onChange={(e) => setWitnessName(e.target.value)}
                        className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Contact Info</label>
                      <input
                        value={witnessContact}
                        onChange={(e) => setWitnessContact(e.target.value)}
                        className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Statement *</label>
                      <textarea
                        value={witnessStatement}
                        onChange={(e) => setWitnessStatement(e.target.value)}
                        rows={3}
                        className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1"
                        required
                      />
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={witnessProtected}
                          onChange={(e) => setWitnessProtected(e.target.checked)}
                          className="rounded"
                        />
                        Protected Witness
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={witnessConfidential}
                          onChange={(e) => setWitnessConfidential(e.target.checked)}
                          className="rounded"
                        />
                        Confidential
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={witnessSubmitting}
                        className="bg-[#0033A0] text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-[#002370] disabled:opacity-50"
                      >
                        {witnessSubmitting ? "Saving..." : (editingWitness ? "Update" : "Add")}
                      </button>
                      <button
                        type="button"
                        onClick={closeWitnessForm}
                        className="border border-slate-300 px-4 py-2 text-sm font-semibold rounded-sm hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-3">
                <div className="font-display font-bold">Forward to Next Stage</div>
                <input
                  value={forwardNote}
                  onChange={(e) => setForwardNote(e.target.value)}
                  placeholder="Forward note (optional)"
                  className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                />
                <div className="flex flex-wrap gap-2">
                  {hasEvidence && (
                    <>
                      <button
                        onClick={forwardToForensic}
                        disabled={forwarding}
                        className="bg-[#0033A0] text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-[#002370] disabled:opacity-60"
                      >
                        Forward to Forensic
                      </button>
                      <button
                        onClick={forwardToCourt}
                        disabled={forwarding}
                        className="bg-[#12B76A] text-white px-4 py-2 text-sm font-semibold rounded-sm hover:opacity-90 disabled:opacity-60"
                      >
                        Forward to Court
                      </button>
                    </>
                  )}
                  {!hasEvidence && (
                    <div className="text-sm text-slate-500">
                      Forward option appears after evidence upload is completed.
                    </div>
                  )}
                </div>
              </div>

              <Evidence caseId={selected.case.case_id} allowForward={false} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}