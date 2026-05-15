import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#22c55e", "#6b7280", "#1e40af"];

export default function Analytics() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [ai, setAi] = useState(null);
  const [aiError, setAiError] = useState("");
  useEffect(() => {
    const load = () => {
      api.get("/analytics/stats").then(({ data }) => setD(data)).catch(() => {});
      api
        .get("/ai/predictions")
        .then(({ data }) => {
          setAi(data);
          setAiError("");
        })
        .catch((e) => {
          const detail = e?.response?.data?.detail;
          if (typeof detail === "string" && detail.trim()) {
            setAiError(detail);
          } else {
            setAiError("AI prediction service is unavailable right now.");
          }
        });
    };
    load();
    const t = setInterval(() => {
      api.get("/analytics/stats").then(({ data }) => setD(data)).catch(() => {});
    }, 20000);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        api.get("/analytics/stats").then(({ data }) => setD(data)).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!d) return <div className="micro-label">Loading…</div>;

  return (
    <div className="space-y-6">
      {(user?.role === "judge" || user?.role === "admin") && (
        <div className="rounded-sm border border-cyan-500/35 bg-slate-950/70 px-4 py-3 text-sm text-cyan-100">
          <span className="font-semibold text-cyan-200">Read-only oversight.</span> Charts reflect system aggregates; this view does not
          modify underlying records.
        </div>
      )}
      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2">Crime Intelligence</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">Analytics</h1>
        <p className="text-sm text-slate-600 mt-2">Rule-based aggregates over FIRs, suspects and evidence.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label mb-4">FIRs by Crime Type</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.by_crime_type}>
              <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 2 }} />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label mb-4">Hotspot Distribution (by Location)</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={d.by_location} dataKey="value" nameKey="name" outerRadius={90} label={{ fontSize: 11 }}>
                {d.by_location.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 2 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm p-5 lg:col-span-2">
          <div className="micro-label mb-4">Monthly Trend</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={d.by_month}>
              <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 2 }} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Total FIRs</div>
          <div className="font-display font-black text-4xl mt-2">{d.total_firs}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Open</div>
          <div className="font-display font-black text-4xl mt-2 text-[#FDB022]">{d.open_cases}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Closed</div>
          <div className="font-display font-black text-4xl mt-2 text-[#12B76A]">{d.closed_cases}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Tampered Evidence</div>
          <div className="font-display font-black text-4xl mt-2 text-[#D92D20]">{d.tampered_evidence}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Appeals (pending)</div>
          <div className="font-display font-black text-4xl mt-2 text-amber-600">{d.pending_appeals ?? 0}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Appeals (total)</div>
          <div className="font-display font-black text-4xl mt-2 text-slate-700">{d.total_appeals ?? 0}</div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <div className="micro-label mb-2">AI Crime Prediction Module</div>
        {!ai ? (
          aiError ? (
            <div className="bg-amber-50 border border-amber-200 rounded-sm p-4">
              <div className="text-sm font-semibold text-amber-800">AI prediction setup required</div>
              <div className="text-sm text-amber-700 mt-1">
                {aiError}. Install backend dependencies: <code>pandas</code>, <code>matplotlib</code>, and <code>seaborn</code>.
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">Loading AI predictions...</div>
          )
        ) : (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-sm p-5">
              <div className="font-display font-bold mb-2">Trend Summary</div>
              <p className="text-sm text-slate-700">{ai.trend_summary}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-sm p-5">
                <div className="micro-label mb-3">Monthly Crime Count (AI)</div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={ai.monthly_crime_count || []}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#6b7280" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 2 }} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-slate-200 rounded-sm p-5">
                <div className="micro-label mb-3">Yearly Crime Trend (AI)</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={ai.yearly_crime_trends || []}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#6b7280" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 2 }} />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-sm p-5 lg:col-span-2">
                <div className="micro-label mb-3">Most Common Crime Types (AI)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ai.most_common_crime_types || []}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#6b7280" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 2 }} />
                    <Bar dataKey="value" fill="#D92D20" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white border border-slate-200 rounded-sm p-5">
                <div className="micro-label mb-3">Top Dangerous Areas</div>
                <ul className="space-y-2 text-sm">
                  {(ai.top_dangerous_areas || []).map((a, idx) => (
                    <li key={`${a.name}-${idx}`} className="flex justify-between border-b border-slate-100 pb-1">
                      <span>{a.name}</span>
                      <span className="font-semibold">{a.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-sm p-5">
                <div className="micro-label mb-3">Area Risk Scoring</div>
                <ul className="space-y-2 text-sm">
                  {(ai.area_risk_scores || []).map((r, idx) => (
                    <li key={`${r.area}-${idx}`} className="flex justify-between border-b border-slate-100 pb-1">
                      <span>{r.area}</span>
                      <span className="font-semibold">{r.risk_level}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-slate-200 rounded-sm p-5">
                <div className="micro-label mb-3">Repeat Offenders</div>
                <ul className="space-y-2 text-sm max-h-56 overflow-y-auto">
                  {(ai.repeat_offenders || []).map((r, idx) => (
                    <li key={`${r.suspect_id || idx}`} className="flex justify-between border-b border-slate-100 pb-1">
                      <span>{r.name || r.suspect_id}</span>
                      <span className="font-semibold">{r.linked_cases_count} cases</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ai.charts?.monthly_trend && (
                <div className="bg-white border border-slate-200 rounded-sm p-3">
                  <div className="micro-label mb-2">Generated Monthly Trend Chart</div>
                  <img src={`${api.defaults.baseURL.replace("/api", "")}${ai.charts.monthly_trend}`} alt="Monthly trend" />
                </div>
              )}
              {ai.charts?.hotspots_pie && (
                <div className="bg-white border border-slate-200 rounded-sm p-3">
                  <div className="micro-label mb-2">Generated Hotspot Chart</div>
                  <img src={`${api.defaults.baseURL.replace("/api", "")}${ai.charts.hotspots_pie}`} alt="Hotspot pie" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
