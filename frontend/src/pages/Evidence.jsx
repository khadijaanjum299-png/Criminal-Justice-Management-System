import { useEffect, useState } from "react";
import { api, formatApiError, API } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Upload, ShieldCheck, ShieldAlert, Download } from "lucide-react";

const TYPES = ["Image", "Video", "Audio", "Document", "Witness Statement", "Fingerprint", "Weapon", "Other"];

export default function Evidence() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [f, setF] = useState({ case_id: "", evidence_type: "Image", description: "", file: null });
  const [uploading, setUploading] = useState(false);
  const [verifyResult, setVerifyResult] = useState({});

  const load = () => api.get("/evidence").then(({ data }) => setList(data));
  useEffect(() => {
    load();
  }, []);

  const canUpload = ["police", "forensic", "admin"].includes(user.role);

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
      await api.post("/evidence", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Evidence uploaded and hashed");
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

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2">Digital Chain of Custody</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">Evidence</h1>
        <p className="text-sm text-slate-600 mt-2">
          Every file hashed with SHA-256 at ingest. Tampering is detectable via hash verification.
        </p>
      </header>

      {canUpload && (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-sm p-6 grid grid-cols-2 gap-4">
          <div>
            <label className="micro-label">Case / FIR ID</label>
            <input
              data-testid="ev-case-id"
              required
              value={f.case_id}
              onChange={(e) => setF({ ...f, case_id: e.target.value })}
              placeholder="FIR-YYYYMMDD-XXXXXX"
              className="w-full border border-slate-300 font-mono px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
          </div>
          <div>
            <label className="micro-label">Type</label>
            <select
              data-testid="ev-type"
              value={f.evidence_type}
              onChange={(e) => setF({ ...f, evidence_type: e.target.value })}
              className="w-full border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
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
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
          </div>
          <div className="col-span-2">
            <label className="micro-label">File</label>
            <input
              data-testid="ev-file"
              type="file"
              onChange={(e) => setF({ ...f, file: e.target.files[0] })}
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1"
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              data-testid="ev-submit"
              disabled={uploading}
              className="bg-[#0033A0] text-white px-5 py-2 text-sm font-semibold rounded-sm hover:bg-[#002370] disabled:opacity-60 flex items-center gap-2"
            >
              <Upload size={14} />
              {uploading ? "Uploading…" : "Upload & Hash"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="text-left px-5 py-2.5 micro-label">Evidence ID</th>
              <th className="text-left px-5 py-2.5 micro-label">Case</th>
              <th className="text-left px-5 py-2.5 micro-label">File</th>
              <th className="text-left px-5 py-2.5 micro-label">Type</th>
              <th className="text-left px-5 py-2.5 micro-label">SHA-256</th>
              <th className="text-left px-5 py-2.5 micro-label">Integrity</th>
            </tr>
          </thead>
          <tbody data-testid="ev-table">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500 text-sm">No evidence uploaded.</td>
              </tr>
            ) : (
              list.map((e) => {
                const v = verifyResult[e.evidence_id];
                return (
                  <tr key={e.evidence_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs">{e.evidence_id}</td>
                    <td className="px-5 py-3 font-mono text-xs">{e.case_id}</td>
                    <td className="px-5 py-3">
                      <a
                        href={`${API}/evidence/${e.evidence_id}/download`}
                        className="text-[#0033A0] hover:underline inline-flex items-center gap-1"
                      >
                        <Download size={12} /> {e.original_filename}
                      </a>
                    </td>
                    <td className="px-5 py-3">{e.type}</td>
                    <td className="px-5 py-3 font-mono text-[10px] text-slate-600 truncate max-w-[180px]">
                      {e.sha256_hash?.slice(0, 20)}…
                    </td>
                    <td className="px-5 py-3">
                      <button
                        data-testid={`ev-verify-${e.evidence_id}`}
                        onClick={() => verify(e.evidence_id)}
                        className="text-xs font-semibold px-2 py-1 border border-slate-300 rounded-sm hover:bg-slate-50 inline-flex items-center gap-1"
                      >
                        {v?.ok === true ? (
                          <><ShieldCheck size={12} className="text-[#12B76A]" /> Verified</>
                        ) : v?.ok === false ? (
                          <><ShieldAlert size={12} className="text-[#D92D20]" /> Tampered</>
                        ) : (
                          <>Verify</>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
