import { useCallback, useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Radio, RefreshCw } from "lucide-react";

const statusTone = (s) => {
  if (s === "sent") return "text-emerald-300 ring-emerald-500/30 bg-emerald-500/10";
  if (s === "failed") return "text-rose-300 ring-rose-500/30 bg-rose-500/10";
  return "text-amber-200/90 ring-amber-500/25 bg-amber-500/10";
};

export default function NotificationLogList({ reloadKey = 0 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/user/notification-logs", { params: { limit: 80 } });
      setLogs(data?.logs || []);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.04)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/90 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-cyan-400/90" aria-hidden />
          <h2 className="font-display text-lg font-bold text-white tracking-tight">Delivery log</h2>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200 disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && logs.length === 0 ? (
        <div className="px-5 py-8 text-sm text-slate-500">Loading log…</div>
      ) : logs.length === 0 ? (
        <div className="px-5 py-8 text-sm text-slate-500">No notifications yet. Alerts appear here after court actions.</div>
      ) : (
        <ul className="divide-y divide-slate-800/80 max-h-[420px] overflow-y-auto scroll-slim">
          {logs.map((row) => (
            <li key={row.id} className="px-5 py-3.5 hover:bg-[#0c1929]/80 transition-colors">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <span className="text-xs font-mono text-cyan-200/80 uppercase tracking-wide">{row.event || "—"}</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ${statusTone(
                    row.status
                  )}`}
                >
                  {row.status}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                {row.channel && <span className="text-slate-500">Channel:</span>}
                <span className="text-slate-300">{row.channel}</span>
                {row.fir_id && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-500">FIR</span>{" "}
                    <span className="font-mono text-slate-200">{row.fir_id}</span>
                  </>
                )}
                {row.case_id && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-500">Case</span>{" "}
                    <span className="font-mono text-slate-200">{row.case_id}</span>
                  </>
                )}
              </div>
              {row.message_preview && (
                <p className="mt-2 text-xs text-slate-500 line-clamp-2" title={row.message_preview}>
                  {row.message_preview}
                </p>
              )}
              <div className="mt-1.5 text-[10px] text-slate-600 font-mono">{row.created_at}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
