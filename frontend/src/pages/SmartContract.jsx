import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Tablet } from "lucide-react";

export default function SmartContract() {
  const [evidenceId, setEvidenceId] = useState("");
  const [shaHash, setShaHash] = useState("");
  const [approvals, setApprovals] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    if (!evidenceId.trim() || !shaHash.trim() || approvals === "") {
      toast.error("Missing required fields");
      return;
    }
    const approvalCount = Number(approvals);
    if (!Number.isFinite(approvalCount) || approvalCount < 0) {
      toast.error("Missing required fields");
      return;
    }

    const payload = {
      evidence_id: evidenceId.trim(),
      approval_count: approvalCount,
      hash_value: shaHash.trim(),
    };

    console.log("Smart contract validate payload:", payload);
    setLoading(true);
    try {
      const { data } = await api.post(
        "/smart-contract/validate",
        JSON.stringify(payload),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      setResult(data);
      if (data?.hash_match === false) {
        toast.error("Invalid hash");
      } else {
        toast.success("Smart contract validated");
      }
    } catch (e) {
      console.error("Smart contract validate error:", e?.response?.data || e);
      const errorText = formatApiError(e.response?.data?.detail) || e.message;
      if (errorText.toLowerCase().includes("field required")) {
        toast.error("Missing required fields");
      } else if (errorText.toLowerCase().includes("invalid hash")) {
        toast.error("Invalid hash");
      } else {
        toast.error(errorText);
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2">Smart Contract Simulator</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">Evidence Contract Validation</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">
          Simulate contract rules using evidence hash verification and approval thresholds. No real blockchain deployment is used.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="micro-label">Evidence ID</label>
              <input
                value={evidenceId}
                onChange={(e) => setEvidenceId(e.target.value)}
                placeholder="Enter evidence ID"
                className="w-full border border-slate-300 px-3 py-2 rounded-sm focus:ring-2 focus:ring-[#0033A0] focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="micro-label">Approval Count</label>
              <input
                type="number"
                min={0}
                value={approvals}
                onChange={(e) => setApprovals(e.target.value)}
                className="w-full border border-slate-300 px-3 py-2 rounded-sm focus:ring-2 focus:ring-[#0033A0] focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="micro-label">SHA-256 Hash</label>
            <textarea
              value={shaHash}
              onChange={(e) => setShaHash(e.target.value)}
              rows={4}
              placeholder="Enter the evidence hash to validate"
              className="w-full border border-slate-300 px-3 py-2 rounded-sm focus:ring-2 focus:ring-[#0033A0] focus:outline-none text-sm font-mono"
            />
          </div>

          <button
            type="button"
            onClick={validate}
            disabled={loading}
            className="bg-[#0033A0] text-white px-5 py-3 text-sm font-semibold rounded-sm hover:bg-[#002370] disabled:opacity-60"
          >
            Validate Smart Contract
          </button>

          {result && (
            <div className="rounded-sm border p-5 text-sm space-y-3 bg-slate-50">
              <div className="flex items-center gap-3">
                {result.accepted ? (
                  <ShieldCheck size={18} className="text-[#166534]" />
                ) : (
                  <ShieldAlert size={18} className="text-[#991b1b]" />
                )}
                <div className="font-semibold text-base">{result.status}</div>
              </div>
              <div className="text-slate-700">{result.message}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
                <div>
                  <div className="font-semibold">Hash Match</div>
                  <div>{result.hash_match ? "Yes" : "No"}</div>
                </div>
                <div>
                  <div className="font-semibold">Approval Threshold</div>
                  <div>{result.approvals_valid ? "Met" : "Not Met"}</div>
                </div>
                <div>
                  <div className="font-semibold">Stored Approval Count</div>
                  <div>{result.stored_approval_count}</div>
                </div>
                <div>
                  <div className="font-semibold">Provided Approval Count</div>
                  <div>{result.provided_approval_count}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Tablet size={18} className="text-[#0033A0]" />
            <div>
              <div className="font-display font-bold tracking-tight">Smart Contract Rules</div>
              <div className="text-sm text-slate-500">The backend simulates decision logic using evidence state and approval thresholds.</div>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold">Rule 1</div>
              <div>Evidence hash must match the stored SHA-256 hash.</div>
            </div>
            <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold">Rule 2</div>
              <div>At least two approvals are required for acceptance.</div>
            </div>
            <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold">Result</div>
              <div>Outputs are either <strong>Accepted</strong> or <strong>Rejected</strong> based on the rules.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
