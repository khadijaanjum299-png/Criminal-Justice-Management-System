import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({
    name: "",
    email: "",
    cnic: "",
    phone: "",
    password: "",
    role: "citizen",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await register(f);
      toast.success("Account created");
      navigate("/dashboard");
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || e.message;
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen login-hero flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-sm p-8 shadow-sm">
        <div className="micro-label mb-2">Create Account</div>
        <h2 className="font-display text-3xl font-black tracking-tight mb-1">Register</h2>
        <p className="text-sm text-slate-600 mb-6">
          Citizens register directly. Officials require admin approval after registration.
        </p>

        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="micro-label">Full Name</label>
            <input
              data-testid="reg-name"
              required
              value={f.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full border border-slate-300 px-3 py-2.5 text-sm rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
          </div>
          <div>
            <label className="micro-label">Email</label>
            <input
              data-testid="reg-email"
              type="email"
              required
              value={f.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full border border-slate-300 px-3 py-2.5 text-sm rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
          </div>
          <div>
            <label className="micro-label">Password</label>
            <input
              data-testid="reg-password"
              type="password"
              required
              minLength={6}
              value={f.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full border border-slate-300 px-3 py-2.5 text-sm rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
          </div>
          <div>
            <label className="micro-label">CNIC / National ID</label>
            <input
              data-testid="reg-cnic"
              value={f.cnic}
              onChange={(e) => update("cnic", e.target.value)}
              className="w-full border border-slate-300 px-3 py-2.5 text-sm rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
              placeholder="XXXXX-XXXXXXX-X"
            />
          </div>
          <div>
            <label className="micro-label">Phone</label>
            <input
              data-testid="reg-phone"
              value={f.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full border border-slate-300 px-3 py-2.5 text-sm rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            />
          </div>
          <div className="col-span-2">
            <label className="micro-label">Role</label>
            <select
              data-testid="reg-role"
              value={f.role}
              onChange={(e) => update("role", e.target.value)}
              className="w-full border border-slate-300 px-3 py-2.5 text-sm rounded-sm mt-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            >
              <option value="citizen">Citizen</option>
              <option value="police">Police Officer</option>
              <option value="forensic">Forensic Expert</option>
            </select>
          </div>

          {err && (
            <div
              data-testid="reg-error"
              className="col-span-2 text-xs text-[#D92D20] bg-red-50 border border-red-200 px-3 py-2 rounded-sm"
            >
              {err}
            </div>
          )}

          <div className="col-span-2 flex items-center justify-between gap-4 mt-2">
            <Link to="/login" className="text-sm text-slate-600 hover:text-[#0033A0]">
              ← Already registered? Sign in
            </Link>
            <button
              data-testid="reg-submit"
              type="submit"
              disabled={loading}
              className="bg-[#0033A0] text-white px-5 py-2.5 text-sm font-semibold rounded-sm hover:bg-[#002370] disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              <UserPlus size={16} />
              {loading ? "Registering…" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
