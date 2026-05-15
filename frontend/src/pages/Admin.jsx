import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const QUEUEABLE_ROLES = ["police", "forensic", "investigator", "court_officer", "judge"];

function backendBase() {
  return (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
}

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [cases, setCases] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [caseQuery, setCaseQuery] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [fraudData, setFraudData] = useState({ trust_scores: [], flags: [] });
  const [blocks, setBlocks] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [logs, setLogs] = useState([]);
  const [detailUser, setDetailUser] = useState(null);
  const [queueRoleByUser, setQueueRoleByUser] = useState({});

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.role, u.status, u.pending_role].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [users, userQuery]);

  const filteredCases = useMemo(() => {
    const q = caseQuery.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((c) =>
      [c.case_id, c.status, c.fir_id, c.title, c.assigned_investigator_name, c.assigned_investigator_email, c.judgment_verdict]
        .some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [cases, caseQuery]);

  const flaggedCount = useMemo(() => {
    const fromFlags = fraudData.flags?.length || 0;
    const fromScores = (fraudData.trust_scores || []).filter(
      (u) => u.risk_level === "Suspicious" || u.risk_level === "High Risk"
    ).length;
    return Math.max(fromFlags, fromScores);
  }, [fraudData]);

  const verdictRows = useMemo(() => {
    return (cases || [])
      .filter((c) => c.judgment_verdict || c.status === "Judgment Issued" || c.status === "Closed")
      .map((c) => {
        const ju = (c.judge_updates || []).filter((x) => x?.type === "verdict_submitted").slice(-1)[0];
        const judgeEmail = ju?.by || c.status_history?.filter((s) => s.status === "Judgment Issued").slice(-1)[0]?.by || "—";
        const chainHits = (blocks || []).filter((b) => b.case_id === c.case_id).length;
        return {
          case_id: c.case_id,
          verdict: c.judgment_verdict || "—",
          judge: judgeEmail,
          accused: c.judgment_accused_suspect_id || "—",
          sentence: c.judgment_sentence || "—",
          status: c.status,
          chain: chainHits > 0 ? "Linked on chain" : "No blocks loaded",
        };
      })
      .slice(0, 80);
  }, [cases, blocks]);

  const load = async () => {
    setLoading(true);
    try {
      const [u, c, f, b, e, l, a] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/cases"),
        api.get("/admin/fraud"),
        api.get("/admin/blockchain"),
        api.get("/admin/evidence"),
        api.get("/admin/logs"),
        api.get("/analytics/stats"),
      ]);
      setUsers(u.data?.users || []);
      setCases(c.data?.cases || []);
      setFraudData({
        trust_scores: f.data?.trust_scores || [],
        flags: f.data?.flags || [],
      });
      setBlocks(b.data?.blocks || []);
      setEvidence(e.data?.evidence || []);
      setLogs(l.data?.logs || []);
      setAnalytics(a.data || null);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      api.get("/analytics/stats").then(({ data }) => setAnalytics(data)).catch(() => {});
    }, 20000);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        api.get("/analytics/stats").then(({ data }) => setAnalytics(data)).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const setStatus = async (userId, status) => {
    try {
      await api.patch("/admin/user/status", { user_id: userId, status });
      toast.success(status === "suspended" ? "User suspended" : "User reactivated");
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const queueRole = async (userId) => {
    const role = queueRoleByUser[userId];
    if (!role) {
      toast.error("Select a role to queue");
      return;
    }
    try {
      await api.patch("/admin/user/queue-role", { user_id: userId, pending_role: role });
      toast.success("Role change queued for approval");
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const approveRole = async (userId) => {
    try {
      await api.post("/admin/user/approve-role-request", { user_id: userId });
      toast.success("Role request approved");
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const rejectRole = async (userId) => {
    try {
      await api.post("/admin/user/reject-role-request", { user_id: userId });
      toast.success("Role request rejected");
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const verifyEvidenceHash = async (hash) => {
    if (!hash) return;
    try {
      const { data } = await api.post("/verify/hash", { hash });
      toast[data.verified ? "success" : "error"](data.message || "Hash check complete");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const verifyEvidenceCid = async (cid) => {
    if (!cid) return;
    try {
      const { data } = await api.post("/verify/cid", { cid });
      toast[data.verified ? "success" : "error"](data.message || "CID check complete");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const openDownload = (evidenceId) => {
    const base = backendBase();
    if (!base) {
      toast.error("Backend URL not configured");
      return;
    }
    window.open(`${base}/api/evidence/${evidenceId}/download`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-8 text-slate-200">
      <header className="border-b border-slate-800 pb-6">
        <div className="micro-label mb-2 text-cyan-500/90 tracking-widest">AUDIT · READ ONLY</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none text-white">Admin Audit Dashboard</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-3xl">
          Monitoring and integrity review only. Evidence, verdicts, and chain records are immutable; this console cannot alter
          operational workflows.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Users" value={users.length} />
        <StatCard title="Cases" value={cases.length} />
        <StatCard title="Flagged" value={flaggedCount} accent />
        <StatCard title="Reopened cases" value={analytics?.reopened_cases ?? "—"} />
        <StatCard title="Appeals (pending)" value={analytics?.pending_appeals ?? "—"} />
      </section>

      <section className="rounded-sm border border-slate-800 bg-slate-950/80 p-5 shadow-[0_0_24px_rgba(34,211,238,0.06)]">
        <div className="font-display font-bold mb-4 text-white">Analytics (read-only)</div>
        {!analytics ? (
          <div className="text-sm text-slate-500">Loading analytics…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="border border-slate-800 rounded-sm p-3 lg:col-span-2 bg-slate-900/50">
              <div className="micro-label mb-2 text-slate-400">Crime trends</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={analytics.by_month || []}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="#334155" />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="#334155" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #22d3ee33", fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="border border-slate-800 rounded-sm p-3 bg-slate-900/50">
              <div className="micro-label mb-2 text-slate-400">Hotspots</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={(analytics.by_location || []).slice(0, 8)}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#334155" />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="#334155" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #22d3ee33", fontSize: 12 }} />
                  <Bar dataKey="value" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="border border-slate-800 rounded-sm p-3 lg:col-span-3 bg-slate-900/50">
              <div className="micro-label mb-2 text-slate-400">Department snapshot</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={[
                    { name: "Investigation", value: analytics.open_cases || 0 },
                    { name: "Court", value: analytics.closed_cases || 0 },
                    { name: "Forensic", value: analytics.total_evidence || 0 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="#334155" />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} stroke="#334155" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #22d3ee33", fontSize: 12 }} />
                  <Bar dataKey="value" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      <SimpleTable
        title="Users (governance)"
        subtitle="Identity, role change requests, and account status for jurisdictional staff."
        variant="governance"
        empty={!loading && filteredUsers.length === 0}
        emptyText="No users found."
      >
        <div className="relative px-6 py-4 border-b border-white/[0.06] bg-slate-950/50 backdrop-blur-sm">
          <Search
            className="pointer-events-none absolute left-9 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-500/45"
            aria-hidden
          />
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Search by name, email, role, or status…"
            className="w-full md:w-[min(100%,28rem)] rounded-xl border border-slate-700/90 bg-slate-900/70 py-2.5 pl-10 pr-4 text-[15px] text-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] placeholder:text-slate-500 transition-[border-color,box-shadow] focus:border-cyan-500/45 focus:outline-none focus:ring-2 focus:ring-cyan-400/25"
          />
        </div>
        <thead className="bg-gradient-to-b from-slate-800/95 to-slate-950/98">
          <tr className="border-b border-cyan-500/20">
            <Th tone="governance">Name</Th>
            <Th tone="governance">Email</Th>
            <Th tone="governance">Role</Th>
            <Th tone="governance">Status</Th>
            <Th tone="governance">Pending role</Th>
            <Th tone="governance" right>
              Actions
            </Th>
          </tr>
        </thead>
        <tbody className="[&_tr:nth-child(even)]:bg-slate-950/35">
          {filteredUsers.map((u) => (
            <tr
              key={u.id}
              className="group border-b border-white/[0.05] transition-colors duration-200 hover:bg-gradient-to-r hover:from-cyan-950/25 hover:via-slate-900/40 hover:to-transparent"
            >
              <Td tone="governance" className="font-display text-[15px] font-semibold tracking-tight text-slate-50">
                {u.name}
              </Td>
              <Td tone="governance" mono className="text-slate-400 group-hover:text-slate-300">
                {u.email}
              </Td>
              <Td tone="governance">
                <span className="inline-flex items-center rounded-lg bg-cyan-950/55 px-2.5 py-1 text-xs font-semibold capitalize tracking-wide text-cyan-100 ring-1 ring-cyan-500/25">
                  {u.role}
                </span>
              </Td>
              <Td tone="governance">
                <StatusBadge status={u.status} />
              </Td>
              <Td tone="governance" mono className="text-[13px] text-amber-200/95">
                {u.pending_role || "—"}
              </Td>
              <Td tone="governance" right>
                <div className="flex max-w-[22rem] flex-wrap justify-end gap-1.5 sm:max-w-none">
                  <button
                    type="button"
                    onClick={() => setDetailUser(u)}
                    className="inline-flex items-center rounded-lg border border-slate-600/90 bg-slate-900/50 px-2.5 py-1.5 text-xs font-semibold text-slate-200 shadow-sm transition-all hover:border-cyan-500/45 hover:bg-cyan-950/30 hover:text-cyan-100"
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    disabled={(u.status || "active").toLowerCase() === "suspended"}
                    onClick={() => setStatus(u.id, "suspended")}
                    className="inline-flex items-center rounded-lg border border-amber-600/45 bg-amber-950/20 px-2.5 py-1.5 text-xs font-semibold text-amber-100 transition-all hover:border-amber-400/60 hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    disabled={(u.status || "active").toLowerCase() !== "suspended"}
                    onClick={() => setStatus(u.id, "active")}
                    className="inline-flex items-center rounded-lg border border-emerald-600/40 bg-emerald-950/25 px-2.5 py-1.5 text-xs font-semibold text-emerald-100 transition-all hover:border-emerald-400/55 hover:bg-emerald-950/45 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Reactivate
                  </button>
                  <select
                    value={queueRoleByUser[u.id] || ""}
                    onChange={(e) => setQueueRoleByUser((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    className="cursor-pointer rounded-lg border border-slate-600/90 bg-slate-900/70 px-2 py-1.5 text-xs font-medium text-slate-200 shadow-sm transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  >
                    <option value="">Queue role…</option>
                    {QUEUEABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => queueRole(u.id)}
                    className="inline-flex items-center rounded-lg border border-slate-600/90 bg-slate-900/50 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:border-cyan-500/45 hover:bg-slate-800/80"
                  >
                    Save queue
                  </button>
                  <button
                    type="button"
                    disabled={!u.pending_role}
                    onClick={() => approveRole(u.id)}
                    className="inline-flex items-center rounded-lg border border-cyan-600/40 bg-cyan-950/35 px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition-all hover:border-cyan-400/55 hover:bg-cyan-950/55 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={!u.pending_role}
                    onClick={() => rejectRole(u.id)}
                    className="inline-flex items-center rounded-lg border border-slate-500/50 bg-slate-900/40 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:border-slate-400 hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Reject
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </SimpleTable>

      <SimpleTable title="Verdicts (read-only)" empty={!loading && verdictRows.length === 0} emptyText="No verdict records.">
        <thead className="bg-slate-900/80">
          <tr className="border-b border-slate-800">
            <Th>Case</Th>
            <Th>Verdict</Th>
            <Th>Judge</Th>
            <Th>Accused ID</Th>
            <Th>Sentence</Th>
            <Th>Status</Th>
            <Th>Chain</Th>
          </tr>
        </thead>
        <tbody>
          {verdictRows.map((row) => (
            <tr key={row.case_id} className="border-b border-slate-800/90 hover:bg-[#0c1929] transition-colors">
              <Td mono>{row.case_id}</Td>
              <Td>{row.verdict}</Td>
              <Td mono className="text-xs">
                {row.judge}
              </Td>
              <Td mono>{row.accused}</Td>
              <Td className="max-w-[200px] truncate" title={row.sentence}>
                {row.sentence}
              </Td>
              <Td>{row.status}</Td>
              <Td className="text-xs text-cyan-300/90">{row.chain}</Td>
            </tr>
          ))}
        </tbody>
      </SimpleTable>

      <SimpleTable title="Cases (read-only)" empty={!loading && filteredCases.length === 0} emptyText="No cases found.">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/40">
          <input
            value={caseQuery}
            onChange={(e) => setCaseQuery(e.target.value)}
            placeholder="Search cases…"
            className="w-full md:w-[460px] border border-slate-700 bg-slate-950 rounded-sm px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
        </div>
        <thead className="bg-slate-900/80">
          <tr className="border-b border-slate-800">
            <Th>Case ID</Th>
            <Th>Status</Th>
            <Th>FIR</Th>
            <Th>Verdict</Th>
          </tr>
        </thead>
        <tbody>
          {filteredCases.slice(0, 100).map((c) => (
            <tr key={c.case_id} className="border-b border-slate-800/90 hover:bg-[#0c1929] transition-colors">
              <Td mono>{c.case_id}</Td>
              <Td>{c.status}</Td>
              <Td mono>{c.fir_id}</Td>
              <Td>{c.judgment_verdict || "—"}</Td>
            </tr>
          ))}
        </tbody>
      </SimpleTable>

      <SimpleTable title="Fraud flags" empty={!loading && (fraudData.flags || []).length === 0} emptyText="No flagged users.">
        <thead className="bg-slate-900/80">
          <tr className="border-b border-slate-800">
            <Th>Type</Th>
            <Th>User</Th>
            <Th>Risk / reason</Th>
            <Th>Date</Th>
          </tr>
        </thead>
        <tbody>
          {(fraudData.flags || []).map((f, idx) => (
            <tr key={f.id || `${f.user_id || "f"}-${idx}`} className="border-b border-slate-800/90 hover:bg-[#0c1929] transition-colors">
              <Td>{f.category || "flag"}</Td>
              <Td>{f.user_email || f.detected_by || "—"}</Td>
              <Td>{f.reason || f.risk_level || "—"}</Td>
              <Td mono>{(f.created_at || "").slice(0, 19).replace("T", " ")}</Td>
            </tr>
          ))}
        </tbody>
      </SimpleTable>

      <SimpleTable title="Blockchain (immutable ledger view)" empty={!loading && blocks.length === 0} emptyText="No blocks.">
        <thead className="bg-slate-900/80">
          <tr className="border-b border-slate-800">
            <Th>Index</Th>
            <Th>Case</Th>
            <Th>Action</Th>
            <Th>Hash</Th>
          </tr>
        </thead>
        <tbody>
          {blocks.slice(0, 80).map((b) => (
            <tr key={b.id} className="border-b border-slate-800/90 hover:bg-[#0c1929] transition-colors">
              <Td>{b.index}</Td>
              <Td mono>{b.case_id}</Td>
              <Td>{b.action_type || b.action}</Td>
              <Td mono>{(b.current_hash || "").slice(0, 24)}…</Td>
            </tr>
          ))}
        </tbody>
      </SimpleTable>

      <SimpleTable title="Evidence (monitoring)" empty={!loading && evidence.length === 0} emptyText="No evidence rows.">
        <thead className="bg-slate-900/80">
          <tr className="border-b border-slate-800">
            <Th>Evidence ID</Th>
            <Th>Case</Th>
            <Th>CID</Th>
            <Th>Integrity</Th>
            <Th right>Review</Th>
          </tr>
        </thead>
        <tbody>
          {evidence.slice(0, 120).map((ev) => (
            <tr key={ev.evidence_id || ev.id} className="border-b border-slate-800/90 hover:bg-[#0c1929] transition-colors">
              <Td mono>{ev.evidence_id}</Td>
              <Td mono>{ev.case_id}</Td>
              <Td mono className="max-w-[180px] truncate" title={ev.cid}>
                {ev.cid || "—"}
              </Td>
              <Td>{ev.tampered ? <span className="text-amber-400">Flagged</span> : <span className="text-emerald-400/90">OK</span>}</Td>
              <Td right>
                <div className="flex flex-wrap justify-end gap-1">
                  <button
                    type="button"
                    disabled={!ev.sha256_hash}
                    onClick={() => verifyEvidenceHash(ev.sha256_hash)}
                    className="px-2 py-1 text-[11px] font-semibold rounded-sm border border-slate-600 hover:bg-[#0c1929] hover:border-cyan-500/50 disabled:opacity-40 transition-colors"
                  >
                    Verify hash
                  </button>
                  <button
                    type="button"
                    disabled={!ev.cid}
                    onClick={() => verifyEvidenceCid(ev.cid)}
                    className="px-2 py-1 text-[11px] font-semibold rounded-sm border border-slate-600 hover:bg-[#0c1929] hover:border-cyan-500/50 disabled:opacity-40 transition-colors"
                  >
                    Verify CID
                  </button>
                  <button
                    type="button"
                    onClick={() => openDownload(ev.evidence_id)}
                    className="px-2 py-1 text-[11px] font-semibold rounded-sm border border-slate-600 hover:bg-[#0c1929] hover:border-cyan-500/50 transition-colors"
                  >
                    Download
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </SimpleTable>

      <SimpleTable title="Audit logs" empty={!loading && logs.length === 0} emptyText="No logs.">
        <thead className="bg-slate-900/80">
          <tr className="border-b border-slate-800">
            <Th>Time</Th>
            <Th>User</Th>
            <Th>Action</Th>
            <Th>Details</Th>
          </tr>
        </thead>
        <tbody>
          {logs.slice(0, 200).map((l) => (
            <tr key={l.id} className="border-b border-slate-800/90 hover:bg-[#0c1929] transition-colors">
              <Td mono>{(l.timestamp || "").slice(0, 19).replace("T", " ")}</Td>
              <Td>{l.user_email}</Td>
              <Td>{l.action}</Td>
              <Td mono className="max-w-[320px] truncate">
                {l.details}
              </Td>
            </tr>
          ))}
        </tbody>
      </SimpleTable>

      {loading && <div className="text-sm text-slate-500">Refreshing audit data…</div>}

      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog">
          <div className="max-w-lg w-full rounded-sm border border-slate-700 bg-slate-950 p-6 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
            <div className="font-display font-bold text-white mb-2">User details</div>
            <pre className="text-xs text-slate-300 overflow-auto max-h-[60vh] whitespace-pre-wrap font-mono">
              {JSON.stringify(detailUser, null, 2)}
            </pre>
            <button
              type="button"
              onClick={() => setDetailUser(null)}
              className="mt-4 w-full py-2 text-sm font-semibold rounded-sm border border-slate-600 hover:bg-[#0c1929] hover:border-cyan-500/50 text-cyan-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, accent = false }) {
  return (
    <div className="rounded-sm border border-slate-800 bg-slate-950/80 p-5 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
      <div className="micro-label text-slate-500">{title}</div>
      <div className={`font-display font-black text-4xl mt-2 text-white ${accent ? "text-amber-400" : ""}`}>{value}</div>
    </div>
  );
}

function SimpleTable({ title, subtitle, children, empty, emptyText, variant = "default" }) {
  const isGov = variant === "governance";
  return (
    <section
      className={
        isGov
          ? "overflow-hidden rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/92 via-slate-950 to-[#071018] shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_28px_56px_-18px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "rounded-sm border border-slate-800 bg-slate-950/60 overflow-hidden shadow-[0_0_24px_rgba(34,211,238,0.04)]"
      }
    >
      <div
        className={
          isGov
            ? "border-b border-cyan-500/15 bg-gradient-to-r from-slate-900/90 via-slate-950/80 to-slate-950/40 px-6 py-5"
            : "px-5 py-3 border-b border-slate-800 font-display font-bold text-white bg-slate-900/60"
        }
      >
        {isGov ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/25">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" aria-hidden />
                </span>
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/95">
                  Governance registry
                </span>
              </div>
              <h2 className="font-display text-2xl font-black tracking-tight text-white sm:text-[1.65rem] sm:leading-tight">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-2 max-w-2xl text-[15px] font-normal leading-relaxed text-slate-400">{subtitle}</p>
              ) : null}
            </div>
          </div>
        ) : (
          title
        )}
      </div>
      <div className={`overflow-x-auto ${isGov ? "scroll-slim" : ""}`}>
        <table
          className={
            isGov
              ? "w-full min-w-[720px] border-collapse text-[15px] leading-snug antialiased"
              : "w-full text-sm min-w-[640px]"
          }
        >
          {children}
        </table>
      </div>
      {empty && (
        <div
          className={
            isGov
              ? "border-t border-white/[0.06] bg-slate-950/40 px-6 py-4 text-[15px] text-slate-500"
              : "px-5 py-3 text-sm text-slate-500"
          }
        >
          {emptyText}
        </div>
      )}
    </section>
  );
}

function Th({ children, right = false, tone = "default" }) {
  const gov =
    "px-5 py-3.5 text-left font-display text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-100/80 first:pl-6 last:pr-6";
  const base = "px-5 py-2.5 micro-label text-slate-400";
  return (
    <th className={`${tone === "governance" ? gov : base} ${right ? "text-right" : "text-left"}`}>{children}</th>
  );
}

function Td({ children, right = false, mono = false, className = "", tone = "default" }) {
  const pad = tone === "governance" ? "px-5 py-3.5 first:pl-6 last:pr-6" : "px-5 py-2.5";
  const monoCls = mono ? (tone === "governance" ? "font-mono text-[13px]" : "font-mono text-xs") : "";
  return (
    <td className={`${pad} text-slate-300 ${right ? "text-right" : ""} ${monoCls} ${className}`}>{children}</td>
  );
}

function StatusBadge({ status }) {
  const raw = (status || "active").toLowerCase();
  const positive = raw === "active" || raw === "approved" || raw === "verified";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize tracking-wide ring-1 ${
        positive
          ? "bg-emerald-500/[0.12] text-emerald-200 ring-emerald-400/30"
          : "bg-rose-500/[0.12] text-rose-100 ring-rose-400/28"
      }`}
    >
      {status || "active"}
    </span>
  );
}
