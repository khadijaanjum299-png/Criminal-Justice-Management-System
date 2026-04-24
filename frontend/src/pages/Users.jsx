import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const ROLES = ["citizen", "police", "forensic", "admin"];

export default function Users() {
  const [list, setList] = useState([]);

  const load = () => api.get("/users").then(({ data }) => setList(data));
  useEffect(() => {
    load();
  }, []);

  const changeRole = async (id, role) => {
    try {
      await api.patch(`/users/${id}`, { role });
      toast.success("Role updated");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const changeTrust = async (id, score) => {
    const v = parseFloat(score);
    if (Number.isNaN(v)) return;
    try {
      await api.patch(`/users/${id}`, { trust_score: v });
      toast.success("Trust score updated");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const removeUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("User deleted");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2">Administration</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">Users</h1>
        <p className="text-sm text-slate-600 mt-2">{list.length} registered accounts</p>
      </header>

      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="text-left px-5 py-2.5 micro-label">Name</th>
              <th className="text-left px-5 py-2.5 micro-label">Email</th>
              <th className="text-left px-5 py-2.5 micro-label">Role</th>
              <th className="text-left px-5 py-2.5 micro-label">Trust Score</th>
              <th className="text-left px-5 py-2.5 micro-label">Joined</th>
              <th className="text-right px-5 py-2.5 micro-label">Actions</th>
            </tr>
          </thead>
          <tbody data-testid="users-rows">
            {list.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-5 py-2.5 font-medium">{u.name}</td>
                <td className="px-5 py-2.5 font-mono text-xs">{u.email}</td>
                <td className="px-5 py-2.5">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="border border-slate-300 bg-white px-2 py-1 text-xs rounded-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-2.5">
                  <input
                    type="number"
                    step="1"
                    defaultValue={u.trust_score}
                    onBlur={(e) => {
                      if (parseFloat(e.target.value) !== u.trust_score) changeTrust(u.id, e.target.value);
                    }}
                    className="w-20 border border-slate-300 px-2 py-1 text-xs rounded-sm font-mono"
                  />
                </td>
                <td className="px-5 py-2.5 text-xs text-slate-500 font-mono">{u.created_at?.slice(0, 10)}</td>
                <td className="px-5 py-2.5 text-right">
                  <button
                    data-testid={`del-user-${u.id}`}
                    onClick={() => removeUser(u.id)}
                    className="text-[#D92D20] hover:bg-red-50 p-1.5 rounded-sm inline-flex items-center"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
