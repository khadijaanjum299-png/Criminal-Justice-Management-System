import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    api.get("/activity-logs").then(({ data }) => setLogs(data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2">Audit Trail</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">Activity Logs</h1>
        <p className="text-sm text-slate-600 mt-2">{logs.length} actions recorded</p>
      </header>

      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="text-left px-5 py-2.5 micro-label">Timestamp</th>
              <th className="text-left px-5 py-2.5 micro-label">User</th>
              <th className="text-left px-5 py-2.5 micro-label">Action</th>
              <th className="text-left px-5 py-2.5 micro-label">Details</th>
            </tr>
          </thead>
          <tbody data-testid="activity-rows">
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 hover-neon">
                <td className="px-5 py-2.5 font-mono text-xs text-slate-600">{l.timestamp?.slice(0, 19).replace("T", " ")}</td>
                <td className="px-5 py-2.5">{l.user_email}</td>
                <td className="px-5 py-2.5">
                  <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-slate-100 border border-slate-200 rounded-sm">
                    {l.action}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-slate-600 font-mono text-xs">{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
