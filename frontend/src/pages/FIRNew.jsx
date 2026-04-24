import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FileText } from "lucide-react";

const CRIME_TYPES = [
  "Theft",
  "Burglary",
  "Assault",
  "Fraud",
  "Cybercrime",
  "Homicide",
  "Drug Offense",
  "Vandalism",
  "Kidnapping",
  "Other",
];

export default function FIRNew() {
  const navigate = useNavigate();
  const [f, setF] = useState({ crime_type: "Theft", location: "", description: "", incident_date: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/firs", f);
      toast.success(`FIR ${data.fir_id} registered`);
      navigate(`/firs/${data.fir_id}`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2">New First Information Report</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">File FIR</h1>
      </header>

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-sm p-6 space-y-5">
        <div>
          <label className="micro-label">Crime Type</label>
          <select
            data-testid="fir-crime-type"
            value={f.crime_type}
            onChange={(e) => setF({ ...f, crime_type: e.target.value })}
            className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
          >
            {CRIME_TYPES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="micro-label">Location</label>
          <input
            data-testid="fir-location"
            required
            value={f.location}
            onChange={(e) => setF({ ...f, location: e.target.value })}
            className="w-full border border-slate-300 px-3 py-2.5 text-sm rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            placeholder="Street, City, District"
          />
        </div>
        <div>
          <label className="micro-label">Date of Incident</label>
          <input
            data-testid="fir-date"
            type="date"
            value={f.incident_date}
            onChange={(e) => setF({ ...f, incident_date: e.target.value })}
            className="w-full border border-slate-300 px-3 py-2.5 text-sm rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
          />
        </div>
        <div>
          <label className="micro-label">Description</label>
          <textarea
            data-testid="fir-description"
            required
            rows={6}
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            className="w-full border border-slate-300 px-3 py-2.5 text-sm rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            placeholder="Describe the incident in detail…"
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/firs")}
            className="px-4 py-2.5 text-sm border border-slate-300 rounded-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            data-testid="fir-submit"
            disabled={loading}
            className="bg-[#0033A0] text-white px-5 py-2.5 text-sm font-semibold rounded-sm hover:bg-[#002370] flex items-center gap-2 disabled:opacity-60"
          >
            <FileText size={16} />
            {loading ? "Registering…" : "Register FIR"}
          </button>
        </div>
      </form>
    </div>
  );
}
