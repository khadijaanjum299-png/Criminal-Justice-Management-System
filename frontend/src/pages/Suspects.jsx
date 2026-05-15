import { useEffect, useState, useMemo } from "react";
import { api, formatApiError } from "@/lib/api";
import { openIpfsUrl } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { UserPlus, Upload, CheckCircle2, ShieldCheck, UserCheck } from "lucide-react";

const riskClass = {
  high: "bg-red-50 text-[#D92D20] border-red-200",
  medium: "bg-yellow-50 text-[#B45309] border-yellow-200",
  low: "bg-green-50 text-[#067647] border-green-200",
};

export default function Suspects() {
  const { user } = useAuth();
  const role = user.role;
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedSuspectId, setSelectedSuspectId] = useState(null);
  const [f, setF] = useState({
    name: "",
    father_name: "",
    age: "",
    gender: "",
    cnic: "",
    address: "",
    phone: "",
    crime_relation: "",
    fir_relation: "",
    charges_under_ppc: "",
    arrest_status: "not_arrested",
    warrant_record: "",
    witness_statements: "",
    custody_record: "",
    investigation_notes: "",
    crime_history: "",
    notes: "",
    risk_level: "low",
  });
  const [linkedCaseId, setLinkedCaseId] = useState("");
  const [cases, setCases] = useState([]);
  const [docFile, setDocFile] = useState(null);
  const [docDescription, setDocDescription] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [verifyRemark, setVerifyRemark] = useState("");
  const [verifyVerdict, setVerifyVerdict] = useState("Verified");

  const canAddSuspect = ["police", "investigator", "forensic", "admin"].includes(role);
  const canEditSuspect = ["police", "investigator", "admin"].includes(role);
  const canUploadDoc = ["police", "investigator", "forensic", "admin"].includes(role);
  const canVerifySuspect = ["investigator", "forensic", "court_officer", "judge"].includes(role);

  const selectedSuspect = useMemo(
    () => list.find((s) => s.suspect_id === selectedSuspectId) || null,
    [list, selectedSuspectId]
  );

  const caseSuggestions = useMemo(() => {
    return cases
      .filter((c) => {
        const query = f.fir_relation?.toString().toLowerCase() || "";
        return (
          c.fir_id?.toLowerCase().includes(query) ||
          c.title?.toLowerCase().includes(query) ||
          c.citizen_name?.toLowerCase().includes(query)
        );
      })
      .slice(0, 20);
  }, [cases, f.fir_relation]);

  const load = () => api.get("/suspects").then(({ data }) => setList(data));
  
  useEffect(() => {
    load();
    // Load cases for case linking
    api.get("/cases").then(({ data }) => setCases(data || [])).catch(() => setCases([]));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/suspects", {
        ...f,
        age: f.age ? parseInt(f.age, 10) : null,
        charges_under_ppc: f.charges_under_ppc
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast.success("Suspect added");
      setOpen(false);
      setF({
        name: "",
        father_name: "",
        age: "",
        gender: "",
        cnic: "",
        address: "",
        phone: "",
        crime_relation: "",
        fir_relation: "",
        charges_under_ppc: "",
        arrest_status: "not_arrested",
        warrant_record: "",
        witness_statements: "",
        custody_record: "",
        investigation_notes: "",
        crime_history: "",
        notes: "",
        risk_level: "low",
      });
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const uploadSuspectDocument = async (e) => {
    e.preventDefault();
    if (!selectedSuspect) {
      toast.error("Select a suspect first.");
      return;
    }
    if (!docFile) {
      toast.error("Choose a document to upload.");
      return;
    }
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append("description", docDescription);
      fd.append("file", docFile);
      await api.post(`/suspects/${selectedSuspect.suspect_id}/documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Suspect document uploaded.");
      setDocFile(null);
      setDocDescription("");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const submitSuspectVerification = async (e) => {
    e.preventDefault();
    if (!selectedSuspect) {
      toast.error("Select a suspect first.");
      return;
    }
    try {
      await api.post(`/suspects/${selectedSuspect.suspect_id}/verify`, {
        verdict: verifyVerdict,
        note: verifyRemark,
      });
      toast.success("Suspect verification recorded.");
      setVerifyRemark("");
      setVerifyVerdict("Verified");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const markAsAccused = async () => {
    if (!selectedSuspect) {
      toast.error("Select a suspect first.");
      return;
    }
    const payload = {
      note: "Marked as accused from suspect profile",
    };
    if (selectedSuspect.associated_cases?.[0]) {
      payload.case_id = selectedSuspect.associated_cases[0];
    }
    try {
      await api.post(`/suspects/${selectedSuspect.suspect_id}/mark-accused`, payload);
      toast.success("Suspect marked as accused.");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const saveSuspectEdits = async () => {
    if (!selectedSuspect || !canEditSuspect) return;
    try {
      await api.patch(`/suspects/${selectedSuspect.suspect_id}`, {
        name: selectedSuspect.name || "",
        father_name: selectedSuspect.father_name || "",
        cnic: selectedSuspect.cnic || "",
        address: selectedSuspect.address || "",
        phone: selectedSuspect.phone || "",
        crime_relation: selectedSuspect.crime_relation || "",
        fir_relation: selectedSuspect.fir_relation || "",
        charges_under_ppc: selectedSuspect.charges_under_ppc || [],
        risk_level: selectedSuspect.risk_level || "low",
        arrest_status: selectedSuspect.arrest_status || "not_arrested",
        notes: selectedSuspect.notes || "",
      });
      toast.success("Suspect profile updated.");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="micro-label mb-2">Criminal Database</div>
          <h1 className="font-display text-4xl font-black tracking-tight leading-none">Suspects</h1>
          <p className="text-sm text-slate-600 mt-2">{list.length} individuals on record</p>
          <div className="mt-3 rounded-sm border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700">
            Investigator / Police can add suspects and upload related documents. Forensic, Court, and Judge roles can review and verify suspect records.
          </div>
        </div>
        {canAddSuspect && (
          <button
            data-testid="btn-new-suspect"
            onClick={() => setOpen((v) => !v)}
            className="btn-primary px-4 py-2.5 text-sm font-semibold rounded-sm flex items-center gap-2"
          >
            <UserPlus size={16} /> {open ? "Close" : "New Suspect"}
          </button>
        )}
      </header>

      {open && (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-sm p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="micro-label">Full Name</label>
            <input
              data-testid="sus-name"
              required
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
          </div>
          <div>
            <label className="micro-label">Age</label>
            <input
              data-testid="sus-age"
              type="number"
              value={f.age}
              onChange={(e) => setF({ ...f, age: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
          </div>
          <div>
            <label className="micro-label">Gender</label>
            <select
              value={f.gender}
              onChange={(e) => setF({ ...f, gender: e.target.value })}
              className="w-full border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="micro-label">Father Name</label>
            <input
              value={f.father_name}
              onChange={(e) => setF({ ...f, father_name: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
          </div>
          <div>
            <label className="micro-label">CNIC</label>
            <input
              value={f.cnic}
              onChange={(e) => setF({ ...f, cnic: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
          </div>
          <div>
            <label className="micro-label">Risk Level</label>
            <select
              data-testid="sus-risk"
              value={f.risk_level}
              onChange={(e) => setF({ ...f, risk_level: e.target.value })}
              className="w-full border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="micro-label">Arrest Status</label>
            <select
              value={f.arrest_status}
              onChange={(e) => setF({ ...f, arrest_status: e.target.value })}
              className="w-full border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            >
              <option value="not_arrested">Not Arrested</option>
              <option value="arrested">Arrested</option>
              <option value="on_bail">On Bail</option>
              <option value="absconding">Absconding</option>
            </select>
          </div>
          <div>
            <label className="micro-label">Phone</label>
            <input
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
          </div>
          <div>
            <label className="micro-label">FIR Relation</label>
            <input
              list="fir-suggestions"
              value={f.fir_relation}
              onChange={(e) => setF({ ...f, fir_relation: e.target.value })}
              placeholder="Type FIR ID, title, or citizen name"
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
            <datalist id="fir-suggestions">
              {caseSuggestions.map((c) => (
                <option
                  key={c.case_id}
                  value={c.fir_id}
                  label={`${c.fir_id} — ${c.title || "Untitled"} (${c.citizen_name || "No citizen"})`}
                />
              ))}
            </datalist>
            {f.fir_relation && !caseSuggestions.some((c) => c.fir_id === f.fir_relation) ? (
              <div className="text-xs text-slate-500 mt-1">No matching case found yet; FIR relation will auto-create/link if the FIR exists.</div>
            ) : null}
          </div>
          <div className="lg:col-span-2">
            <label className="micro-label">Charges Under PPC (comma separated)</label>
            <input
              value={f.charges_under_ppc}
              onChange={(e) => setF({ ...f, charges_under_ppc: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="micro-label">Address</label>
            <input
              value={f.address}
              onChange={(e) => setF({ ...f, address: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="micro-label">Crime Association</label>
            <textarea
              rows={2}
              value={f.crime_relation}
              onChange={(e) => setF({ ...f, crime_relation: e.target.value })}
              placeholder="How is this suspect related to the crime(s)?"
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="micro-label">Investigation Notes</label>
            <textarea
              rows={3}
              value={f.investigation_notes}
              onChange={(e) => setF({ ...f, investigation_notes: e.target.value })}
              placeholder="Initial investigation notes..."
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="micro-label">Additional Notes</label>
            <textarea
              rows={2}
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="micro-label">Crime History</label>
            <textarea
              rows={4}
              value={f.crime_history}
              onChange={(e) => setF({ ...f, crime_history: e.target.value })}
              className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none"
            />
          </div>
          <div className="lg:col-span-2 flex justify-end">
            <button
              data-testid="sus-submit"
              className="btn-primary px-5 py-2 text-sm font-semibold rounded-sm"
            >
              Save Suspect
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden table-wrap">
        <table className="w-full text-sm table-sticky-head">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="text-left px-5 py-2.5 micro-label">ID</th>
              <th className="text-left px-5 py-2.5 micro-label">Name</th>
              <th className="text-left px-5 py-2.5 micro-label">Age</th>
              <th className="text-left px-5 py-2.5 micro-label">Gender</th>
              <th className="text-left px-5 py-2.5 micro-label">CNIC</th>
              <th className="text-left px-5 py-2.5 micro-label">Status</th>
              <th className="text-left px-5 py-2.5 micro-label">Risk</th>
            </tr>
          </thead>
          <tbody data-testid="sus-table">
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-500 text-sm">
                  No suspects on record.
                </td>
              </tr>
            ) : (
              list.map((s) => (
                <tr
                  key={s.suspect_id}
                  onClick={() => setSelectedSuspectId(s.suspect_id)}
                  className={`border-b border-slate-100 hover-neon cursor-pointer transition-colors ${
                    selectedSuspectId === s.suspect_id ? "bg-slate-50" : ""
                  }`}
                >
                  <td className="px-5 py-3 font-mono text-xs">{s.suspect_id}</td>
                  <td className="px-5 py-3 font-medium">{s.name}</td>
                  <td className="px-5 py-3">{s.age || "—"}</td>
                  <td className="px-5 py-3 text-sm capitalize">{s.gender || "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs">{s.cnic || "—"}</td>
                  <td className="px-5 py-3 text-sm">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase border rounded-sm ${s.is_accused ? "bg-red-50 text-red-700 border-red-300" : "bg-blue-50 text-blue-700 border-blue-300"}`}>
                      {s.is_accused ? "Accused" : "Suspect"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase border rounded-sm ${riskClass[s.risk_level] || riskClass.low}`}>
                      {s.risk_level}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedSuspect && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-sm p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="micro-label">Selected Suspect</div>
                  <h2 className="font-display text-2xl font-black tracking-tight mt-1">{selectedSuspect.name}</h2>
                </div>
                <div className="text-xs font-mono text-slate-500">{selectedSuspect.suspect_id}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`inline-block px-2 py-1 text-[10px] font-semibold uppercase border rounded-sm ${selectedSuspect.is_accused ? "bg-red-50 text-red-700 border-red-300" : "bg-slate-100 text-slate-600 border-slate-300"}`}>
                  {selectedSuspect.is_accused ? "Accused" : "Suspect"}
                </span>
                {canEditSuspect && (
                  <button
                    type="button"
                    onClick={saveSuspectEdits}
                    className="btn-secondary text-xs font-semibold px-3 py-1 rounded-sm"
                  >
                    <span className="inline-flex items-center gap-1"><UserCheck size={14} /> Save Profile</span>
                  </button>
                )}
                {["investigator", "court_officer", "judge", "admin"].includes(role) && (
                  <button
                    type="button"
                    onClick={markAsAccused}
                    className="btn-danger text-xs font-semibold px-3 py-1 rounded-sm"
                  >
                    <span className="inline-flex items-center gap-1"><UserCheck size={14} /> Mark as Accused</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
                <div className="rounded-sm border border-slate-200 p-4">
                  <div className="micro-label">Age</div>
                  <div className="mt-2">{selectedSuspect.age || "—"}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-4">
                  <div className="micro-label">Gender</div>
                  <div className="mt-2 capitalize">{selectedSuspect.gender || "—"}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-4">
                  <div className="micro-label">CNIC</div>
                  <div className="mt-2 font-mono">{selectedSuspect.cnic || "—"}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-4">
                  <div className="micro-label">Father Name</div>
                  <div className="mt-2">{selectedSuspect.father_name || "—"}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-4">
                  <div className="micro-label">Phone</div>
                  <div className="mt-2">{selectedSuspect.phone || "—"}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-4">
                  <div className="micro-label">Arrest Status</div>
                  <div className="mt-2 capitalize">{selectedSuspect.arrest_status?.replace(/_/g, " ") || "—"}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-4 md:col-span-2">
                  <div className="micro-label">Address</div>
                  <div className="mt-2">{selectedSuspect.address || "—"}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-4 md:col-span-2">
                  <div className="micro-label">Cases Associated</div>
                  <div className="mt-2 text-slate-600">
                    {(selectedSuspect.associated_cases || []).length > 0 ? (
                      <div className="space-y-1">
                        {selectedSuspect.associated_cases.map((cid) => (
                          <div key={cid} className="px-2 py-1 bg-blue-50 border border-blue-200 rounded text-sm font-mono">
                            {cid}
                          </div>
                        ))}
                      </div>
                    ) : (
                      "Not linked to any case"
                    )}
                  </div>
                </div>
                <div className="rounded-sm border border-slate-200 p-4 md:col-span-2">
                  <div className="micro-label">Charges Under PPC</div>
                  <div className="mt-2 text-slate-600">{(selectedSuspect.charges_under_ppc || []).join(", ") || "Not recorded."}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-4 md:col-span-2">
                  <div className="micro-label">Crime Association</div>
                  <div className="mt-2 text-slate-600">{selectedSuspect.crime_relation || "No details provided."}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-4 md:col-span-2">
                  <div className="micro-label">Investigation Notes</div>
                  <div className="mt-2 text-slate-600">{selectedSuspect.investigation_notes || "No notes."}</div>
                </div>
                <div className="rounded-sm border border-slate-200 p-4 md:col-span-2">
                  <div className="micro-label">Crime History</div>
                  <div className="mt-2 text-slate-600">{selectedSuspect.crime_history || "No history recorded."}</div>
                </div>
              </div>

              {selectedSuspect.is_accused && selectedSuspect.sentence_status && (
                <div className="mt-6">
                  <div className="font-display font-bold mb-4 text-lg">Sentence Information</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="rounded-sm border border-slate-200 p-4">
                      <div className="micro-label">Sentence Status</div>
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-sm ${
                          selectedSuspect.sentence_status === "Active Sentence" ? "bg-red-100 text-red-700" :
                          selectedSuspect.sentence_status === "Completed Sentence" ? "bg-green-100 text-green-700" :
                          selectedSuspect.sentence_status === "Released" ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {selectedSuspect.sentence_status}
                        </span>
                      </div>
                    </div>
                    {(selectedSuspect.sentence_duration_years > 0 || selectedSuspect.sentence_duration_months > 0) && (
                      <div className="rounded-sm border border-slate-200 p-4">
                        <div className="micro-label">Prison Duration</div>
                        <div className="mt-2 font-semibold">
                          {selectedSuspect.sentence_duration_years > 0 && `${selectedSuspect.sentence_duration_years} year${selectedSuspect.sentence_duration_years > 1 ? 's' : ''}`}
                          {selectedSuspect.sentence_duration_years > 0 && selectedSuspect.sentence_duration_months > 0 && ', '}
                          {selectedSuspect.sentence_duration_months > 0 && `${selectedSuspect.sentence_duration_months} month${selectedSuspect.sentence_duration_months > 1 ? 's' : ''}`}
                        </div>
                      </div>
                    )}
                    {selectedSuspect.fine_amount > 0 && (
                      <div className="rounded-sm border border-slate-200 p-4">
                        <div className="micro-label">Fine Amount</div>
                        <div className="mt-2 font-semibold">PKR {selectedSuspect.fine_amount.toLocaleString()}</div>
                      </div>
                    )}
                    {selectedSuspect.imprisonment_start_date && (
                      <div className="rounded-sm border border-slate-200 p-4">
                        <div className="micro-label">Imprisonment Start</div>
                        <div className="mt-2 font-mono text-sm">{new Date(selectedSuspect.imprisonment_start_date).toLocaleDateString()}</div>
                      </div>
                    )}
                    {selectedSuspect.expected_release_date && (
                      <div className="rounded-sm border border-slate-200 p-4">
                        <div className="micro-label">Expected Release</div>
                        <div className="mt-2 font-mono text-sm">
                          {new Date(selectedSuspect.expected_release_date).toLocaleDateString()}
                          {selectedSuspect.sentence_status === "Active Sentence" && (
                            <div className="text-xs text-slate-500 mt-1">
                              {(() => {
                                const now = new Date();
                                const release = new Date(selectedSuspect.expected_release_date);
                                const diffTime = release - now;
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                if (diffDays > 0) {
                                  return `${diffDays} days remaining`;
                                } else if (diffDays === 0) {
                                  return "Releases today";
                                } else {
                                  return `${Math.abs(diffDays)} days overdue`;
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="rounded-sm border border-slate-200 p-4">
                      <div className="micro-label">Parole Status</div>
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-sm ${
                          selectedSuspect.parole_eligible ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                        }`}>
                          {selectedSuspect.parole_eligible ? "Eligible" : "Not Eligible"}
                        </span>
                      </div>
                    </div>
                    {selectedSuspect.verdict_issued_at && (
                      <div className="rounded-sm border border-slate-200 p-4">
                        <div className="micro-label">Verdict Issued</div>
                        <div className="mt-2 font-mono text-sm">{new Date(selectedSuspect.verdict_issued_at).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                  {["judge", "admin"].includes(role) && selectedSuspect.sentence_status !== "Released" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedSuspect.sentence_status === "Active Sentence" && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("Mark sentence as completed?")) return;
                            try {
                              await api.patch(`/suspects/${selectedSuspect.suspect_id}/sentence`, {
                                sentence_status: "Completed Sentence"
                              });
                              toast.success("Sentence marked as completed");
                              load();
                            } catch (e) {
                              toast.error(formatApiError(e.response?.data?.detail) || e.message);
                            }
                          }}
                          className="btn-success text-xs font-semibold px-3 py-1 rounded-sm"
                        >
                          Mark Completed
                        </button>
                      )}
                      {(selectedSuspect.sentence_status === "Active Sentence" || selectedSuspect.sentence_status === "Completed Sentence") && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("Release prisoner?")) return;
                            try {
                              await api.patch(`/suspects/${selectedSuspect.suspect_id}/sentence`, {
                                sentence_status: "Released"
                              });
                              toast.success("Prisoner released");
                              load();
                            } catch (e) {
                              toast.error(formatApiError(e.response?.data?.detail) || e.message);
                            }
                          }}
                          className="btn-primary text-xs font-semibold px-3 py-1 rounded-sm"
                        >
                          Release Prisoner
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-sm p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <div className="micro-label">Suspect Documents</div>
                  <div className="text-sm text-slate-500">Upload supporting files and access them from IPFS when available.</div>
                </div>
                {canUploadDoc && (
                  <span className="text-xs text-slate-500">Drag or select a document below.</span>
                )}
              </div>
              {canUploadDoc && (
                <form onSubmit={uploadSuspectDocument} className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                  <div className="lg:col-span-2">
                    <input
                      type="file"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                    />
                  </div>
                  <div>
                    <input
                      value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                      placeholder="Document description"
                      className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={!docFile || uploadingDoc}
                      className="btn-primary px-4 py-2 text-sm font-semibold rounded-sm disabled:opacity-60 flex items-center gap-2"
                    >
                      <Upload size={14} /> {uploadingDoc ? "Uploading…" : "Upload Document"}
                    </button>
                  </div>
                </form>
              )}

              {(selectedSuspect.documents || []).length > 0 ? (
                <div className="space-y-3">
                  {(selectedSuspect.documents || []).map((doc) => (
                    <div key={doc.document_id} className="rounded-sm border border-slate-200 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-semibold text-foreground">{doc.original_filename}</div>
                          <div className="text-xs text-slate-500">{doc.description || "Chain document"}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xs text-slate-500">{doc.uploaded_by}</div>
                          <div className="text-xs text-slate-500">{doc.uploaded_at}</div>
                          {doc.cid ? (
                            <button
                              type="button"
                              onClick={async () => {
                                const { ok, error } = await openIpfsUrl(doc.cid, null);
                                if (!ok) toast.error(error || "IPFS content temporarily unavailable");
                              }}
                              className="text-xs font-semibold text-[#0033A0] hover:underline"
                            >
                              Open from IPFS
                            </button>
                          ) : (
                            <div className="text-xs text-slate-400">No CID</div>
                          )}
                          {doc.sha256_hash ? (
                            <div className="text-[11px] font-mono text-slate-500">{doc.sha256_hash.slice(0, 16)}...</div>
                          ) : null}
                          {canVerifySuspect && doc.sha256_hash && doc.cid && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const { data } = await api.post(`/suspects/${selectedSuspect.suspect_id}/documents/${doc.document_id}/verify`);
                                  if (data.ok && data.hash_verified && data.cid_verified) {
                                    toast.success("Document Authenticated");
                                  } else if (data.hash_verified && !data.cid_verified) {
                                    toast.error(data.message || "CID Verified failed");
                                  } else {
                                    toast.error(data.message || "Tampered or Invalid");
                                  }
                                  load();
                                } catch (e) {
                                  toast.error(formatApiError(e.response?.data?.detail) || e.message);
                                }
                              }}
                              className="text-xs font-semibold text-[#0033A0] hover:underline"
                            >
                              <span className="inline-flex items-center gap-1"><ShieldCheck size={14} /> Verify Hash + CID</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-sm border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No suspect documents uploaded yet.</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-sm p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="micro-label">Verification Status</div>
                  <div className="text-sm text-slate-500">Visible to forensic, court, and judge roles.</div>
                </div>
                {selectedSuspect.verifications?.length > 0 && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{selectedSuspect.verifications.length} reviews</span>
                )}
              </div>
              {(selectedSuspect.verifications || []).length === 0 ? (
                <div className="rounded-sm border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No verification entries yet.</div>
              ) : (
                <div className="space-y-3">
                  {(selectedSuspect.verifications || []).map((verification) => (
                    <div key={verification.id} className="rounded-sm border border-slate-200 p-4 bg-slate-50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">{verification.verdict}</div>
                        <div className="text-xs text-slate-500">{verification.verified_at}</div>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">{verification.note || "No notes provided."}</div>
                      <div className="text-xs text-slate-400 mt-2">Reviewed by {verification.verified_by}</div>
                    </div>
                  ))}
                </div>
              )}

              {canVerifySuspect && (
                <form onSubmit={submitSuspectVerification} className="space-y-3 mt-4">
                  <div className="grid grid-cols-1 gap-3">
                    <select
                      value={verifyVerdict}
                      onChange={(e) => setVerifyVerdict(e.target.value)}
                      className="w-full border border-slate-300 bg-white px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                    >
                      <option value="Verified">Verified</option>
                      <option value="Suspicious">Suspicious</option>
                    </select>
                    <textarea
                      rows={3}
                      value={verifyRemark}
                      onChange={(e) => setVerifyRemark(e.target.value)}
                      placeholder="Verification note"
                      className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary px-4 py-2 rounded-sm text-sm font-semibold flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Record Verification
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
