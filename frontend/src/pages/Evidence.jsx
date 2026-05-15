import { useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "@/lib/api";
import { getIpfsViewUrl, openIpfsUrl } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Upload, ShieldCheck, ShieldAlert, Download } from "lucide-react";

const TYPES = ["Image", "Video", "Audio", "Document", "Witness Statement", "Fingerprint", "Weapon", "Other"];

export default function Evidence({ caseId, allowForward = true }) {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [f, setF] = useState({ case_id: caseId || "", evidence_type: "Image", description: "", file: null });
  const [uploading, setUploading] = useState(false);
  const [verifyResult, setVerifyResult] = useState({});
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(null);
  const [manualHashInput, setManualHashInput] = useState("");
  const [manualVerifyResult, setManualVerifyResult] = useState(null);
  const [cidInput, setCidInput] = useState("");
  const [cidFile, setCidFile] = useState(null);
  const [cidVerifyResult, setCidVerifyResult] = useState(null);
  const [lastUploadedEvidence, setLastUploadedEvidence] = useState(null);
  const [ipfsStatus, setIpfsStatus] = useState({ connected: false, status: "Unknown", message: "Checking..." });
  const [cocFile, setCocFile] = useState(null);
  const [cocUploading, setCocUploading] = useState(false);
  const [overviewStats, setOverviewStats] = useState(null);

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

  const load = useCallback(() => api.get("/evidence", { params: caseId ? { case_id: caseId } : {} }).then(({ data }) => setList(data)), [caseId]);

  // Fetch IPFS status
  useEffect(() => {
    const checkIpfs = async () => {
      try {
        const { data } = await api.get("/ipfs/status");
        setIpfsStatus(data);
      } catch (err) {
        // Silently fail - IPFS status is not critical
      }
    };
    checkIpfs();
    const interval = setInterval(checkIpfs, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    if (caseId) {
      setF((current) => ({ ...current, case_id: caseId }));
    }
  }, [caseId]);

  const canUpload = ["investigator", "police", "admin"].includes(user.role);
  const showIntegrityControls = user.role !== "investigator";
  const showDownload = user.role !== "investigator";
  const canApprove = ["investigator", "forensic", "judge"].includes(user.role);
  const canVerifyCid = ["forensic", "judge", "court_officer"].includes(user.role);
  const hasVerificationMetadata = (item) =>
    Boolean(item?.sha256_hash && item?.cid && item?.block_index !== null && item?.block_index !== undefined);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.file) {
      toast.error("Select a file");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("case_id", f.case_id);
      fd.append("evidence_type", f.evidence_type);
      fd.append("description", f.description);
      fd.append("file", f.file);
      const { data } = await api.post("/evidence", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Evidence uploaded and hashed");
      setLastUploadedEvidence(data);
      setF({ case_id: "", evidence_type: "Image", description: "", file: null });
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setUploading(false);
    }
  };

  const verify = async (eid) => {
    try {
      const { data } = await api.get(`/evidence/${eid}/verify`);
      setVerifyResult((r) => ({ ...r, [eid]: data }));
      if (data.ok) toast.success(data.message);
      else toast.error(data.message);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const selectedEvidence = list.find((e) => e.evidence_id === selectedEvidenceId);
  const approvalCount = selectedEvidence?.approvals?.length || 0;
  const trustStatus = approvalCount >= 2 ? "Evidence Trusted ✅" : "Pending Verification ⏳";
  const alreadyApproved = !!selectedEvidence?.approvals?.some((a) => a.user === user.email);

  useEffect(() => {
    setCidInput(selectedEvidence?.cid || "");
    setCidFile(null);
    setCidVerifyResult(null);
  }, [selectedEvidenceId, selectedEvidence?.cid]);

  const copyHash = async (hash) => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      toast.success("Hash copied to clipboard");
    } catch (err) {
      toast.error("Unable to copy hash");
    }
  };

  const approveEvidence = async () => {
    if (!selectedEvidenceId) return;
    try {
      const { data } = await api.post(`/evidence/${selectedEvidenceId}/approve`);
      if (data.ok) {
        toast.success(data.message || "Evidence approved");
        load();
      } else {
        toast.error(data.message || "Approval failed");
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const forwardToForensic = async (evidenceId) => {
    try {
      // Find the evidence to get case_id
      const evidence = list.find(e => e.evidence_id === evidenceId);
      if (!evidence) {
        toast.error("Unable to forward: evidence not found in list");
        return;
      }
      
      // Update case status to forward to forensic
      await api.patch(`/cases/${evidence.case_id}/status`, {
        status: "forwarded_to_forensic",
        forwarded_to: "forensic",
        remarks: `Evidence ${evidenceId} forwarded to forensic review`
      });
      
      toast.success("Evidence forwarded to forensic review");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const verifyCid = async () => {
    if (!selectedEvidenceId) return;
    if (!cidInput.trim()) {
      toast.error("Enter a CID to verify");
      return;
    }
    if (!cidFile) {
      toast.error("Upload a file to verify against the CID");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("cid", cidInput.trim());
      fd.append("file", cidFile);
      const { data } = await api.post(`/evidence/${selectedEvidenceId}/cid-verify`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCidVerifyResult(data);
      if (data.ok) {
        toast.success(data.message);
        load();
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const verifyPastedHash = () => {
    if (!selectedEvidence) {
      toast.error("Select evidence to verify.");
      return;
    }
    if (!manualHashInput.trim()) {
      toast.error("Paste the hash to verify.");
      return;
    }
    const ok = manualHashInput.trim() === selectedEvidence.sha256_hash;
    setManualVerifyResult({
      ok,
      message: ok ? "Hash matches - evidence is authentic." : "Hash mismatch - evidence may be tampered.",
    });
    toast[ok ? "success" : "error"](ok ? "Hash verified successfully." : "Hash mismatch detected.");
  };

  const uploadChainOfCustodyDocument = async () => {
    if (!selectedEvidenceId) return;
    if (!cocFile) {
      toast.error("Choose a document to upload.");
      return;
    }
    setCocUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", cocFile);
      const { data } = await api.post(`/evidence/${selectedEvidenceId}/chain-doc`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Chain of custody document saved.");
      setCocFile(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setCocUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="micro-label mb-2 text-muted-foreground">Digital Chain of Custody</div>
            <h1 className="font-display text-4xl font-black tracking-tight leading-none text-foreground">Evidence</h1>
          </div>
          <div className={`px-3 py-2 rounded-sm text-sm font-semibold ${ipfsStatus.connected ? 'bg-green-900/20 text-green-300 border border-green-700' : 'bg-yellow-900/20 text-yellow-300 border border-yellow-700'}`}>
            {ipfsStatus.connected ? "Connected" : "IPFS Offline"}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Every file hashed with SHA-256 at ingest. Tampering is detectable via hash verification.
        </p>
        <div className="mt-4 rounded-sm border border-yellow-300/40 bg-yellow-950/10 p-4 text-sm text-yellow-100">
          Tip: Select an evidence row to open the detail panel below, upload chain-of-custody documents, and verify CID or hash from the same page.
        </div>
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
          <div key={s.label} className="bg-card border border-border rounded-sm p-4">
            <div className="micro-label text-[10px] text-muted-foreground">{s.label}</div>
            <div className="font-display font-black text-2xl tracking-tight mt-1 text-foreground">{s.value ?? "—"}</div>
          </div>
        ))}
      </div>

      {canUpload && (
        <form onSubmit={submit} className="bg-card border border-border rounded-sm p-6 grid grid-cols-2 gap-4">
          <div className={caseId ? "col-span-2" : ""}>
            <label className="micro-label">Case / FIR ID</label>
            {caseId ? (
              <div className="mt-1 w-full border border-border bg-muted font-mono px-3 py-2 text-sm rounded-sm text-foreground">
                {caseId}
              </div>
            ) : (
              <input
                data-testid="ev-case-id"
                required
                value={f.case_id}
                onChange={(e) => setF({ ...f, case_id: e.target.value })}
                placeholder="FIR-YYYYMMDD-XXXXXX"
                className="w-full border border-border bg-background font-mono px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-ring focus:outline-none text-foreground"
              />
            )}
          </div>
          <div>
            <label className="micro-label">Type</label>
            <select
              data-testid="ev-type"
              value={f.evidence_type}
              onChange={(e) => setF({ ...f, evidence_type: e.target.value })}
              className="w-full border border-border bg-background px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-ring focus:outline-none text-foreground"
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="micro-label">Description</label>
            <input
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              className="w-full border border-border px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-ring focus:outline-none text-foreground"
            />
          </div>
          <div className="col-span-2">
            <label className="micro-label">File</label>
            <input
              data-testid="ev-file"
              type="file"
              onChange={(e) => setF({ ...f, file: e.target.files[0] })}
              className="w-full border border-border px-3 py-2 text-sm rounded-sm mt-1"
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              data-testid="ev-submit"
              disabled={uploading}
              className="bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold rounded-sm hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2"
            >
              <Upload size={14} />
              {uploading ? "Uploading…" : "Upload & Hash"}
            </button>
          </div>
        </form>
      )}

      {lastUploadedEvidence && (
        <div className="bg-card border border-border rounded-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="micro-label mb-1 text-muted-foreground">Evidence Successfully Uploaded</div>
              <h3 className="font-display text-xl font-black tracking-tight text-foreground">Evidence Details</h3>
            </div>
            <button
              onClick={() => setLastUploadedEvidence(null)}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-muted border border-border rounded-sm p-4">
              <div className="micro-label text-muted-foreground">Evidence ID</div>
              <div className="font-mono text-sm mt-1 text-foreground">{lastUploadedEvidence.evidence_id}</div>
            </div>
            <div className="bg-muted border border-border rounded-sm p-4">
              <div className="micro-label text-muted-foreground">SHA-256 Hash</div>
              <div className="font-mono text-xs mt-1 break-all text-foreground">{lastUploadedEvidence.sha256_hash}</div>
            </div>
            <div className="bg-muted border border-border rounded-sm p-4">
              <div className="micro-label text-muted-foreground">CID</div>
              <div className="font-mono text-xs mt-1 break-all text-foreground">
                {lastUploadedEvidence.cid || "No CID available (IPFS offline)"}
              </div>
            </div>
            <div className="bg-muted border border-border rounded-sm p-4">
              <div className="micro-label text-muted-foreground">IPFS Status</div>
              <div className={`mt-1 font-semibold ${
                lastUploadedEvidence.ipfs_status === "online" ? "text-green-500" : 
                lastUploadedEvidence.ipfs_status === "failed" ? "text-red-500" : "text-yellow-400"
              }`}>
                {lastUploadedEvidence.ipfs_status === "online" ? "✓ Uploaded" : 
                 lastUploadedEvidence.ipfs_status === "failed" ? "✗ Failed" : "Local Only"}
              </div>
            </div>
            <div className="bg-muted border border-border rounded-sm p-4">
              <div className="micro-label text-muted-foreground">Uploaded By</div>
              <div className="mt-1 text-foreground">{lastUploadedEvidence.uploaded_by}</div>
            </div>
            <div className="bg-muted border border-border rounded-sm p-4">
              <div className="micro-label text-muted-foreground">Upload Timestamp</div>
              <div className="font-mono text-xs mt-1 text-foreground">{lastUploadedEvidence.uploaded_at}</div>
            </div>
            <div className="bg-muted border border-border rounded-sm p-4">
              <div className="micro-label text-muted-foreground">Blockchain Block</div>
              <div className="font-mono text-sm mt-1 text-foreground">#{lastUploadedEvidence.block_index || "Pending"}</div>
            </div>
            <div className="bg-muted border border-border rounded-sm p-4">
              <div className="micro-label text-muted-foreground">Chain Status</div>
              <div className="mt-1 font-semibold text-green-500">✓ Valid Chain</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-green-200">
            {lastUploadedEvidence.cid && (
              <>
                <button
                  onClick={() => openFromIpfs(lastUploadedEvidence.cid)}
                  className="bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold rounded-sm hover:bg-primary/90 flex items-center gap-2"
                >
                  🌐 Open from IPFS
                </button>
                <button
                  onClick={async () => {
                    const { ok, error } = await openIpfsUrl(lastUploadedEvidence.cid, ipfsStatus?.connected ? ipfsStatus?.gateway_url : null);
                    if (!ok) toast.error(error || "IPFS content temporarily unavailable");
                  }}
                  className="bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold rounded-sm hover:bg-secondary/80 flex items-center gap-2"
                >
                  🌍 Public Gateway
                </button>
              </>
            )}
            {hasVerificationMetadata(lastUploadedEvidence) && (
              <button
                onClick={() => verify(lastUploadedEvidence.evidence_id)}
                className="bg-green-600 text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-green-700 flex items-center gap-2"
              >
                🔍 Verify Hash
              </button>
            )}
            {hasVerificationMetadata(lastUploadedEvidence) && canVerifyCid && (
              <button
                onClick={() => {
                  setSelectedEvidenceId(lastUploadedEvidence.evidence_id);
                  setCidInput(lastUploadedEvidence.cid);
                }}
                className="bg-blue-600 text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-blue-700 flex items-center gap-2"
              >
                🔗 Verify CID
              </button>
            )}
            {allowForward && user.role === "investigator" && (
              <button
                onClick={() => forwardToForensic(lastUploadedEvidence.evidence_id)}
                className="bg-purple-600 text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-purple-700 flex items-center gap-2"
              >
                🔄 Forward to Forensic
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-full table-auto">
          <thead className="bg-muted sticky top-0 z-10">
            <tr className="border-b border-border">
              <th className="text-left px-5 py-2.5 micro-label">Evidence ID</th>
              <th className="text-left px-5 py-2.5 micro-label">Case</th>
              <th className="text-left px-5 py-2.5 micro-label">File</th>
              <th className="text-left px-5 py-2.5 micro-label">Type</th>
              <th className="text-left px-5 py-2.5 micro-label">SHA-256 Hash</th>
              <th className="text-left px-5 py-2.5 micro-label">CID</th>
              <th className="text-left px-5 py-2.5 micro-label">IPFS</th>
              <th className="text-left px-5 py-2.5 micro-label">Uploaded</th>
              <th className="text-left px-5 py-2.5 micro-label">Blockchain</th>
              {showIntegrityControls && <th className="text-left px-5 py-2.5 micro-label">Actions</th>}
            </tr>
          </thead>
          <tbody data-testid="ev-table">
            {list.length === 0 ? (
              <tr>
                <td colSpan={showIntegrityControls ? 10 : 9} className="px-5 py-10 text-center text-muted-foreground text-sm">No evidence uploaded.</td>
              </tr>
            ) : (
              list.map((e) => {
                const v = verifyResult[e.evidence_id];
                return (
                  <tr key={e.evidence_id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-5 py-3 font-mono text-xs">{e.evidence_id}</td>
                    <td className="px-5 py-3 font-mono text-xs">{e.case_id}</td>
                    <td className="px-5 py-3">
                      {showDownload ? (
                        <a
                          href={`${process.env.REACT_APP_BACKEND_URL}/api/evidence/${e.evidence_id}/download`}
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <Download size={12} /> {e.original_filename}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{e.original_filename}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">{e.type}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                          <span title={e.sha256_hash} className="font-mono text-[10px] text-muted-foreground truncate max-w-[180px] block">
                          {e.sha256_hash?.slice(0, 20)}…
                        </span>
                        <button
                          type="button"
                          onClick={() => copyHash(e.sha256_hash)}
                          className="text-[10px] font-semibold text-primary hover:underline"
                        >
                          Copy
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[180px] block" title={e.cid}>
                          {e.cid ? `${e.cid.slice(0, 18)}…` : "No CID"}
                        </span>
                        {e.cid && (
                          <button
                            type="button"
                            onClick={() => openFromIpfs(e.cid)}
                            className="text-[10px] font-semibold text-primary hover:underline"
                            title="Open from local IPFS gateway"
                          >
                            Open IPFS
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className={`text-[10px] font-semibold ${e.ipfs_status === "online" ? "text-green-700" : e.ipfs_status === "failed" ? "text-red-700" : "text-yellow-600"}`}>
                        {e.ipfs_status === "online" ? "✓ Online" : e.ipfs_status === "failed" ? "✗ Failed" : "Local"}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-xs text-muted-foreground leading-snug">
                      <div className="whitespace-normal break-words">{e.uploaded_by}</div>
                      <div className="font-mono mt-0.5">{e.uploaded_at?.slice(0, 10)}</div>
                    </td>
                    <td className="px-5 py-4 align-top text-xs leading-snug">
                      <div className="font-mono text-muted-foreground">Block #{e.block_index || "—"}</div>
                      <div className={`text-[10px] font-semibold ${e.chain_status === "valid" ? "text-green-700" : "text-red-700"}`}>
                        {e.chain_status || "Unknown"}
                      </div>
                    </td>
                    {showIntegrityControls && (
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1">
                          {hasVerificationMetadata(e) && (
                            <button
                              data-testid={`ev-verify-${e.evidence_id}`}
                              onClick={() => verify(e.evidence_id)}
                              className={`text-xs font-semibold px-2 py-1 border rounded-sm ${
                                v?.ok === true ? "border-green-300 bg-green-50 text-green-800" : 
                                v?.ok === false ? "border-red-300 bg-red-50 text-red-800" : 
                                "border-border hover:bg-muted"
                              }`}
                            >
                              {v?.ok === true ? "✓ Verified" : v?.ok === false ? "✗ Tampered" : "Verify"}
                            </button>
                          )}
                          {hasVerificationMetadata(e) && canVerifyCid && e.cid && (
                            <button
                              onClick={() => {
                                setSelectedEvidenceId(e.evidence_id);
                                setCidInput(e.cid);
                                setCidFile(null);
                                setCidVerifyResult(null);
                              }}
                              className="text-xs font-semibold px-2 py-1 border border-border rounded-sm hover:bg-muted"
                            >
                              Verify CID
                            </button>
                          )}
                          {allowForward && user.role === "investigator" && (
                            <button
                              onClick={() => forwardToForensic(e.evidence_id)}
                              className="text-xs font-semibold px-2 py-1 border border-purple-300 bg-purple-50 text-purple-800 rounded-sm hover:bg-purple-100"
                            >
                              Forward to Forensic
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {selectedEvidence && (
        <div className="bg-card border border-border rounded-sm p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="micro-label">Verification Panel</div>
              <h2 className="font-display text-2xl font-black tracking-tight">Evidence Details</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEvidenceId(null)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-card border border-border rounded-sm p-4">
              <div className="micro-label">Uploaded By</div>
              <div className="font-mono mt-2">{selectedEvidence.uploaded_by}</div>
            </div>
            <div className="bg-card border border-border rounded-sm p-4">
              <div className="micro-label">Uploaded At</div>
              <div className="font-mono mt-2">{selectedEvidence.uploaded_at}</div>
            </div>
            <div className="bg-card border border-border rounded-sm p-4">
              <div className="micro-label">Approval Count</div>
              <div className="font-display font-black text-3xl mt-2">{approvalCount}</div>
            </div>
            <div className="bg-card border border-border rounded-sm p-4">
              <div className="micro-label">Status</div>
              <div className="font-display font-black text-2xl mt-2">{trustStatus}</div>
            </div>
            <div className="bg-card border border-border rounded-sm p-4">
              <div className="micro-label">Chain Status</div>
              <div className="font-display font-black text-2xl mt-2">{selectedEvidence.chain_status || "Broken Chain"}</div>
            </div>
            <div className="bg-card border border-border rounded-sm p-4">
              <div className="micro-label">CID Status</div>
              <div className="font-display font-black text-2xl mt-2">
                {selectedEvidence.cid_verified ? "Verified ✅" : "Not Verified ❌"}
              </div>
            </div>
            <div className="bg-card border border-border rounded-sm p-4 md:col-span-1">
              <div className="micro-label">Consensus</div>
              <div className="font-display font-black text-2xl mt-2">{approvalCount >= 2 ? "Consensus Reached" : "Consensus Pending"}</div>
            </div>
            <div className="bg-card border border-border rounded-sm p-4 md:col-span-2">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="micro-label">SHA-256 Hash</div>
                <button
                  type="button"
                  onClick={() => copyHash(selectedEvidence.sha256_hash)}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Copy Hash
                </button>
              </div>
              <div className="font-mono text-[11px] break-all text-foreground">{selectedEvidence.sha256_hash}</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-sm p-5">
            <div className="micro-label mb-3 text-muted-foreground">CID Details</div>
            <div className="text-sm text-muted-foreground space-y-2">
              <div>
                <span className="font-semibold">CID:</span>
                <span className="font-mono text-[11px] break-all text-foreground ml-2">
                  {selectedEvidence.cid || "Not available"}
                </span>
              </div>
              <div>
                <span className="font-semibold">IPFS Status:</span>
                <span className={`ml-2 font-semibold ${selectedEvidence.ipfs_status === "online" ? "text-green-700" : selectedEvidence.ipfs_status === "failed" ? "text-red-700" : "text-yellow-700"}`}>
                  {selectedEvidence.ipfs_status === "online" ? "✓ Uploaded to IPFS" : selectedEvidence.ipfs_status === "failed" ? "✗ Upload Failed" : "Local Only"}
                </span>
              </div>
              <div>
                <span className="font-semibold">CID Verified:</span>
                <span className={`ml-2 font-semibold ${selectedEvidence.cid_verified ? "text-green-700" : "text-red-700"}`}>
                  {selectedEvidence.cid_verified ? "✓ Yes" : "✗ No"}
                </span>
              </div>
              <div>
                <span className="font-semibold">Verified By:</span>
                <span className="text-foreground ml-2">{selectedEvidence.cid_verified_by || "—"}</span>
              </div>
              <div>
                <span className="font-semibold">Verified At:</span>
                <span className="text-foreground ml-2">{selectedEvidence.cid_verified_at || "—"}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedEvidence.cid && (
                <>
                  <button
                    type="button"
                    onClick={() => openFromIpfs(selectedEvidence.cid)}
                    className="bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold rounded-sm hover:bg-primary/90"
                    title="Open from local IPFS gateway"
                  >
                    Open from IPFS
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const { ok, error } = await openIpfsUrl(selectedEvidence.cid, ipfsStatus?.connected ? ipfsStatus?.gateway_url : null);
                      if (!ok) toast.error(error || "IPFS content temporarily unavailable");
                    }}
                    className="bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold rounded-sm hover:bg-secondary/80"
                    title="Open from public gateway"
                  >
                    Open Public Gateway
                  </button>
                </>
              )}
              {!selectedEvidence.cid && (
                <div className="text-sm text-yellow-400 italic">
                  CID not available. File may have been uploaded before IPFS was configured, or IPFS is offline.
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-sm p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <div className="micro-label">Chain of Custody Documents</div>
                <div className="text-sm text-muted-foreground">Upload case-linked custody files for the selected evidence item.</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <input
                  type="file"
                  onChange={(e) => setCocFile(e.target.files?.[0] || null)}
                  className="w-full border border-border bg-background px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={uploadChainOfCustodyDocument}
                  disabled={!cocFile || cocUploading}
                  className="bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold rounded-sm hover:bg-primary/90 disabled:opacity-60"
                >
                  {cocUploading ? "Uploading…" : "Upload COC Document"}
                </button>
              </div>
            </div>
            {(selectedEvidence.chain_of_custody_docs || []).length > 0 ? (
              <div className="mt-4 space-y-3">
                {(selectedEvidence.chain_of_custody_docs || []).map((doc) => (
                  <div key={doc.document_id} className="rounded-sm border border-border bg-muted p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-foreground">{doc.original_filename}</div>
                        <div className="text-xs text-muted-foreground mt-1">{doc.description || "Chain of custody record"}</div>
                      </div>
                      {doc.cid ? (
                        <button
                          type="button"
                          onClick={() => openFromIpfs(doc.cid)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Open IPFS
                        </button>
                      ) : (
                        <div className="text-xs text-slate-500">No CID available</div>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Uploaded by {doc.uploaded_by} on {doc.uploaded_at}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-sm border border-border bg-muted p-4 text-sm text-muted-foreground">No chain of custody documents have been attached for this evidence yet.</div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="micro-label mb-3">Manual Hash Verification</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Paste hash to verify"
                value={manualHashInput}
                onChange={(e) => setManualHashInput(e.target.value)}
                className="w-full border border-border bg-background px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
              <button
                onClick={verifyPastedHash}
                className="bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold rounded-sm hover:bg-primary/90"
              >
                Verify Hash
              </button>
            </div>
            {manualVerifyResult && (
              <div className={`mt-3 p-3 rounded-sm text-sm ${manualVerifyResult.ok ? 'bg-green-900/10 text-green-200 border border-green-700' : 'bg-red-900/10 text-red-200 border border-red-700'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {manualVerifyResult.ok ? <ShieldCheck size={16} className="text-green-300" /> : <ShieldAlert size={16} className="text-red-300" />}
                  <span className="font-semibold">
                    {manualVerifyResult.ok ? "AUTHENTICATED" : "TAMPER DETECTED"}
                  </span>
                </div>
                <div>{manualVerifyResult.ok ? "Hash matches - evidence is authentic" : "Hash mismatch - evidence has been tampered with"}</div>
              </div>
            )}
          </div>

          {canVerifyCid && (
            <div className="bg-card border border-border rounded-sm p-5">
              <div className="micro-label mb-3 text-muted-foreground">CID Verification</div>
              <p className="text-sm text-muted-foreground mb-4">
                Only authorized roles can verify CIDs: Judge, Court Officer, Forensic Expert
              </p>
              <div className="grid grid-cols-1 gap-3">
                <input
                  value={cidInput}
                  onChange={(e) => setCidInput(e.target.value)}
                  placeholder="Enter CID to verify"
                  className="w-full border border-border bg-background px-3 py-2 rounded-sm focus:ring-2 focus:ring-ring focus:outline-none text-sm font-mono text-foreground"
                />
                <label className="block text-sm font-semibold text-foreground">Upload file to verify against CID</label>
                <input
                  type="file"
                  onChange={(e) => setCidFile(e.target.files?.[0] || null)}
                  className="w-full border border-border px-3 py-2 rounded-sm text-sm"
                />
                <button
                  type="button"
                  onClick={verifyCid}
                  className="bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold rounded-sm hover:bg-primary/90"
                >
                  Verify CID
                </button>
              </div>
              {cidVerifyResult && (
                <div className={`mt-4 rounded-sm px-4 py-3 text-sm space-y-2 ${cidVerifyResult.ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  <div className={`font-semibold ${cidVerifyResult.ok ? "text-green-900" : "text-red-900"}`}>
                    {cidVerifyResult.message}
                  </div>
                  <div className={`text-xs ${cidVerifyResult.ok ? "text-green-700" : "text-red-700"}`}>
                    <div><span className="font-semibold">Generated CID:</span> <span className="font-mono">{cidVerifyResult.generated_cid?.slice(0, 20)}...</span></div>
                    <div><span className="font-semibold">Expected CID:</span> <span className="font-mono">{cidVerifyResult.expected_cid?.slice(0, 20)}...</span></div>
                    {cidVerifyResult.ipfs_status && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="font-semibold">IPFS Status:</span> {cidVerifyResult.ipfs_status}
                        {cidVerifyResult.ipfs_verified && " ✓ Verified on network"}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedEvidence.approvals?.length > 0 && (
            <div className="bg-card border border-border rounded-sm p-5">
              <div className="micro-label mb-3 text-muted-foreground">Approval Log</div>
              <div className="space-y-3">
                {selectedEvidence.approvals.map((approval, idx) => (
                  <div key={idx} className="rounded-sm border border-border bg-card p-3 text-sm">
                    <div className="font-semibold text-foreground">{approval.role}</div>
                    <div className="text-muted-foreground">{approval.user}</div>
                    <div className="text-xs text-muted-foreground mt-1">{approval.timestamp}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canApprove && (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="micro-label">Approval Control</div>
                <div className="text-sm text-muted-foreground">Approve this evidence as part of chain of custody verification.</div>
              </div>
              <button
                type="button"
                onClick={approveEvidence}
                disabled={alreadyApproved}
                className="bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold rounded-sm hover:bg-primary/90 disabled:opacity-60"
              >
                {alreadyApproved ? "Already approved" : "Approve Evidence"}
              </button>
            </div>
          )}

          <div className="bg-card border border-border rounded-sm p-5">
            <div className="micro-label mb-4 text-muted-foreground">Chain of Custody</div>
            <div className="space-y-4">
              {(selectedEvidence.chainOfCustody || []).map((entry, index) => (
                <div key={`${entry.action}-${index}`} className="flex gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {index < (selectedEvidence.chainOfCustody || []).length - 1 && <span className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="grow rounded-sm border border-border bg-muted p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-semibold text-foreground">{entry.action}</div>
                      <div className="text-xs text-muted-foreground font-mono">{entry.timestamp}</div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">{entry.performedBy}</div>
                    {entry.remarks ? <div className="text-xs text-muted-foreground mt-2">{entry.remarks}</div> : null}
                  </div>
                </div>
              ))}
              {(selectedEvidence.chainOfCustody || []).length === 0 && (
                <div className="rounded-sm border border-border bg-muted p-4 text-sm text-muted-foreground">No chain of custody entries available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
