import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#0033A0", "#D92D20", "#FDB022", "#12B76A", "#6B7280", "#002370"];

export default function Analytics() {
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get("/analytics/stats").then(({ data }) => setD(data)).catch(() => {});
  }, []);

  if (!d) return <div className="micro-label">Loading…</div>;

  return (
    <div className="space-y-6">
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
              <Bar dataKey="value" fill="#0033A0" />
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
              <Line type="monotone" dataKey="value" stroke="#0033A0" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>
    </div>
  );
}
