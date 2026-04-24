import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

const riskClass = {
  high: "bg-red-50 text-[#D92D20] border-red-200",
  medium: "bg-yellow-50 text-[#B45309] border-yellow-200",
  low: "bg-green-50 text-[#067647] border-green-200",
};

export default function Suspects() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", age: "", cnic: "", address: "", crime_history: "", risk_level: "low" });

  const load = () => api.get("/suspects").then(({ data }) => setList(data));
  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/suspects", { ...f, age: f.age ? parseInt(f.age) : null });
      toast.success("Suspect added");
      setOpen(false);
      setF({ name: "", age: "", cnic: "", address: "", crime_history: "", risk_level: "low" });
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="micro-label mb-2">Criminal Database</div>
          <h1 className="font-display text-4xl font-black tracking-tight leading-none">Suspects</h1>
          <p className="text-sm text-slate-600 mt-2">{list.length} individuals on record</p>
        </div>
        <button
          data-testid="btn-new-suspect"
          onClick={() => setOpen((v) => !v)}
          className="bg-[#0033A0] text-white px-4 py-2.5 text-sm font-semibold rounded-sm hover:bg-[#002370] flex items-center gap-2"
        >
          <UserPlus size={16} /> {open ? "Close" : "New Suspect"}
        </button>
      </header>

      {open && (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-sm p-6 grid grid-cols-2 gap-4">
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
            <label className="micro-label">CNIC</label>
            <input value={f.cnic} onChange={(e) => setF({ ...f, cnic: e.target.value })} className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none" />
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
          <div className="col-span-2">
            <label className="micro-label">Address</label>
            <input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="micro-label">Crime History</label>
            <textarea rows={3} value={f.crime_history} onChange={(e) => setF({ ...f, crime_history: e.target.value })} className="w-full border border-slate-300 px-3 py-2 text-sm rounded-sm mt-1 focus:ring-2 focus:ring-[#0033A0] focus:outline-none" />
          </div>
          <div className="col-span-2 flex justify-end">
            <button data-testid="sus-submit" className="bg-[#0033A0] text-white px-5 py-2 text-sm font-semibold rounded-sm hover:bg-[#002370]">
              Save Suspect
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="text-left px-5 py-2.5 micro-label">ID</th>
              <th className="text-left px-5 py-2.5 micro-label">Name</th>
              <th className="text-left px-5 py-2.5 micro-label">Age</th>
              <th className="text-left px-5 py-2.5 micro-label">CNIC</th>
              <th className="text-left px-5 py-2.5 micro-label">Address</th>
              <th className="text-left px-5 py-2.5 micro-label">Risk</th>
            </tr>
          </thead>
          <tbody data-testid="sus-table">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500 text-sm">No suspects on record.</td>
              </tr>
            ) : (
              list.map((s) => (
                <tr key={s.suspect_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs">{s.suspect_id}</td>
                  <td className="px-5 py-3 font-medium">{s.name}</td>
                  <td className="px-5 py-3">{s.age || "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs">{s.cnic || "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{s.address || "—"}</td>
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
    </div>
  );
}
