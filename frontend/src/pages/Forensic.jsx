import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Fingerprint } from "lucide-react";

export default function Forensic() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [f, setF] = useState({
    case_id: "",
    call_logs: "",
    emails: "",
    ip_addresses: "",
    device_ids: "",
    browser_history: "",
    social_media: "",
    deleted_files: "",
    notes: "",
  });

  const load = () => api.get("/forensic").then(({ data }) => setList(data));
  useEffect(() => { load(); }, []);

  const canAdd = user.role === "forensic" || user.role === "admin";

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/forensic", f);
      toast.success("Forensic record saved");
      setF({ case_id: "", call_logs: "", emails: "", ip_addresses: "", device_ids: "", browser_history: "", social_media: "", deleted_files: "", notes: "" });
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const fields = [
    ["case_id", "Case / FIR ID"],
    ["call_logs", "Call Logs"],
    ["emails", "Email Records"],
    ["ip_addresses", "IP Addresses"],
    ["device_ids", "Device IDs"],
    ["browser_history", "Browser History"],
    ["social_media", "Social Media Evidence"],
    ["deleted_files", "Recovered Deleted Files"],
    ["notes", "Analyst Notes"],
  ];

  return (
    <div className="space-y-6">
      <header
        className="border-b border-slate-200 pb-6 relative overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,1) 40%, rgba(255,255,255,0.85)), url('https://images.unsplash.com/photo-1759265212078-520b362f2920?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NDh8MHwxfHNlYXJjaHwzfHxmaW5nZXJwcmludCUyMGFic3RyYWN0JTIwZGlnaXRhbHxlbnwwfHx8fDE3NzcwNDA2MTV8MA&ixlib=rb-4.1.0&q=85')",
          backgroundSize: "cover",
          backgroundPosition: "right center",
        }}
      >
        <div className="micro-label mb-2">Digital Forensics Lab</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">Forensic Records</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-xl">
          Call logs, network trails, device fingerprints, deleted-file recovery and cybercrime artefacts.
        </p>
      </header>

      {canAdd && (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-sm p-6 grid grid-cols-2 gap-4">
          {fields.map(([k, label]) => (
            <div key={k} className={k === "notes" || k === "deleted_files" ? "col-span-2" : ""}>
              <label className="micro-label">{label}</label>
              {k === "notes" || k === "deleted_files" ? (
                <textarea
                  data-testid={`forensic-${k}`}
                  rows={3}
                  value={f[k]}
                  onChange={(e) => setF({ ...f, [k]: e.target.value })}
                  className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
                />
              ) : (
                <input
                  data-testid={`forensic-${k}`}
                  required={k === "case_id"}
                  value={f[k]}
                  onChange={(e) => setF({ ...f, [k]: e.target.value })}
                  className={`w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none ${k === "case_id" ? "font-mono" : ""}`}
                />
              )}
            </div>
          ))}
          <div className="col-span-2 flex justify-end">
            <button
              data-testid="forensic-submit"
              className="bg-[#0033A0] text-white px-5 py-2 text-sm font-semibold rounded-sm hover:bg-[#002370] flex items-center gap-2"
            >
              <Fingerprint size={14} /> Save Forensic Record
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3" data-testid="forensic-list">
        {list.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-sm p-10 text-center text-slate-500 text-sm">
            No forensic records yet.
          </div>
        ) : (
          list.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-mono text-sm text-[#0033A0]">{r.case_id}</div>
                <div className="text-xs text-slate-500">{r.uploaded_at?.slice(0, 19).replace("T", " ")}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {fields.slice(1).map(([k, label]) =>
                  r[k] ? (
                    <div key={k}>
                      <div className="micro-label">{label}</div>
                      <div className="text-sm mt-1 whitespace-pre-wrap">{r[k]}</div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
