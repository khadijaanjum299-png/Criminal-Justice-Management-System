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
    <div className="min-h-screen login-hero flex items-center justify-center p-6 bg-[#0B1120]">
      <div className="w-full max-w-xl bg-slate-900/60 border border-cyan-500/20 rounded-3xl p-8 shadow-[0_0_30px_rgba(6,182,212,0.2)] backdrop-blur-sm neon-glow">
        <div className="micro-label mb-2 text-cyan-300/80">Create Account</div>
        <h2 className="font-display text-3xl font-black tracking-tight mb-1 text-slate-100">Register</h2>
        <p className="text-sm text-slate-400 mb-6">
          Citizens register directly. Officials require admin approval after registration.
        </p>

        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="micro-label text-slate-300">Full Name</label>
            <input
              data-testid="reg-name"
              required
              value={f.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-white rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="micro-label text-slate-300">Email</label>
            <input
              data-testid="reg-email"
              type="email"
              required
              value={f.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-white rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="micro-label text-slate-300">Password</label>
            <input
              data-testid="reg-password"
              type="password"
              required
              minLength={6}
              value={f.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-white rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="micro-label text-slate-300">CNIC / National ID</label>
            <input
              data-testid="reg-cnic"
              value={f.cnic}
              onChange={(e) => update("cnic", e.target.value)}
              className="w-full border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-white rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
              placeholder="XXXXX-XXXXXXX-X"
            />
          </div>
          <div>
            <label className="micro-label text-slate-300">Phone</label>
            <input
              data-testid="reg-phone"
              value={f.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-white rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
            />
          </div>
          <div className="col-span-2">
            <label className="micro-label text-slate-300">Role</label>
            <select
              data-testid="reg-role"
              value={f.role}
              onChange={(e) => update("role", e.target.value)}
              className="w-full border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-white rounded-sm mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
            >
              <option value="citizen">Citizen</option>
              <option value="police">Police Officer</option>
              <option value="forensic">Forensic Expert</option>
              <option value="investigator">Investigator</option>
              <option value="court_officer">Court Officer</option>
              <option value="judge">Judge</option>
            </select>
          </div>

          {err && (
            <div
              data-testid="reg-error"
              className="col-span-2 text-xs text-red-200 bg-[#3f1d24] border border-red-700 px-3 py-2 rounded-sm"
            >
              {err}
            </div>
          )}

          <div className="col-span-2 flex items-center justify-between gap-4 mt-2">
            <Link to="/login" className="text-sm text-cyan-400 hover:text-cyan-300">
              ← Already registered? Sign in
            </Link>
            <button
              data-testid="reg-submit"
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 text-sm font-semibold rounded-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] disabled:opacity-60 transition-all flex items-center gap-2"
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
