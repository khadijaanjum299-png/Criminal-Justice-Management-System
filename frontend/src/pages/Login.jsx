import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { ShieldCheck, Gavel } from "lucide-react";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/dashboard", { replace: true });
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
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
    <div className="min-h-screen login-hero grid md:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden md:flex flex-col justify-between p-12 border-r border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0033A0] text-white flex items-center justify-center rounded-sm">
            <Gavel size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-black text-lg tracking-tight">Criminal Justice System</div>
            <div className="micro-label">Digital Forensics Platform</div>
          </div>
        </div>

        <div className="max-w-md">
          <div className="micro-label mb-4">PLATFORM // v1.0</div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight leading-[0.95] mb-6">
            Tamper-proof case records, powered by chained hashes.
          </h1>
          <p className="text-base text-slate-700 leading-relaxed">
            A unified environment for FIR intake, investigation, evidence integrity,
            digital forensics and jurisdictional audit — with a simulated blockchain
            ledger verifying every action.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="border-t border-slate-300 pt-3">
            <div className="font-display font-black text-2xl">SHA-256</div>
            <div className="micro-label mt-1">Evidence Hashing</div>
          </div>
          <div className="border-t border-slate-300 pt-3">
            <div className="font-display font-black text-2xl">4</div>
            <div className="micro-label mt-1">Role Tiers</div>
          </div>
          <div className="border-t border-slate-300 pt-3">
            <div className="font-display font-black text-2xl">∞</div>
            <div className="micro-label mt-1">Audit Trail</div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0033A0] text-white flex items-center justify-center rounded-sm">
              <Gavel size={20} />
            </div>
            <div className="font-display font-black">CJS Platform</div>
          </div>
          <div className="micro-label mb-2">Restricted Access</div>
          <h2 className="font-display text-3xl font-black mb-1 tracking-tight">Sign in</h2>
          <p className="text-sm text-slate-600 mb-8">Authorized personnel and registered citizens only.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="micro-label">Email</label>
              <input
                data-testid="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent rounded-sm mt-1"
                placeholder="you@agency.gov"
              />
            </div>
            <div>
              <label className="micro-label">Password</label>
              <input
                data-testid="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent rounded-sm mt-1"
                placeholder="••••••••"
              />
            </div>
            {err && (
              <div
                data-testid="login-error"
                className="text-xs text-[#D92D20] bg-red-50 border border-red-200 px-3 py-2 rounded-sm"
              >
                {err}
              </div>
            )}
            <button
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-[#0033A0] text-white py-2.5 text-sm font-semibold rounded-sm hover:bg-[#002370] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} />
              {loading ? "Authenticating…" : "Access Platform"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 text-sm text-slate-600">
            No account yet?{" "}
            <Link
              to="/register"
              data-testid="link-register"
              className="text-[#0033A0] font-semibold hover:underline"
            >
              Register →
            </Link>
          </div>
          <div className="mt-6 text-[11px] font-mono text-slate-500 border border-slate-200 p-3 rounded-sm">
            Demo admin: <span className="font-semibold">admin@cjs.gov</span> / Admin@123
          </div>
        </div>
      </div>
    </div>
  );
}
