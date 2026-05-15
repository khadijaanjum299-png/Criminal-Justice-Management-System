import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FileText, Upload, X } from "lucide-react";

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
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("crime_type", f.crime_type);
      formData.append("location", f.location);
      formData.append("description", f.description);
      if (f.incident_date) formData.append("incident_date", f.incident_date);

      files.forEach(file => {
        formData.append("files", file);
      });

      const { data } = await api.post("/firs", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success(`FIR ${data.fir_id} registered with ${files.length} document(s)`);
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

        <div>
          <label className="micro-label">Supporting Documents</label>
          <div className="mt-1">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.mp3,.mp4,.avi,.mov"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-sm cursor-pointer hover:border-[#0033A0] transition-colors"
            >
              <div className="text-center">
                <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                <div className="text-sm text-slate-600">Click to upload documents</div>
                <div className="text-xs text-slate-500 mt-1">CNIC, images, PDFs, audio, video files</div>
              </div>
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-sm px-3 py-2">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-500" />
                    <span className="text-sm text-slate-700">{file.name}</span>
                    <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/firs")}
            className="px-4 py-2.5 text-sm border border-slate-300 rounded-sm hover-neon"
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
