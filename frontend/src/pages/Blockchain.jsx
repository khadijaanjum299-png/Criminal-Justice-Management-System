import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Link2, ShieldCheck, ShieldAlert } from "lucide-react";

export default function Blockchain() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/blockchain").then(({ data }) => setData(data)).catch(() => {});
  }, []);

  if (!data) return <div className="micro-label">Loading…</div>;

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <div className="micro-label mb-2">Immutable Audit Ledger</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none">Blockchain</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">
          Every FIR, evidence upload, forensic record and status change is appended as a SHA-256-chained block.
          Any tampering breaks the chain — instantly detectable.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Chain Length</div>
          <div className="font-display font-black text-4xl mt-2" data-testid="chain-length">
            {data.count}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Hash Algorithm</div>
          <div className="font-display font-black text-2xl mt-2 font-mono">SHA-256</div>
        </div>
        <div
          data-testid="chain-integrity"
          className={`border rounded-sm p-5 ${data.integrity_ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
        >
          <div className="micro-label">Integrity Status</div>
          <div className={`font-display font-black text-2xl mt-2 flex items-center gap-2 ${data.integrity_ok ? "text-[#12B76A]" : "text-[#D92D20]"}`}>
            {data.integrity_ok ? <><ShieldCheck size={22} /> VERIFIED</> : <><ShieldAlert size={22} /> BROKEN</>}
          </div>
        </div>
      </div>

      <div className="space-y-4" data-testid="blocks-list">
        {data.blocks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-sm p-10 text-center text-slate-500 text-sm">
            Chain empty — first FIR or evidence upload will create the genesis block.
          </div>
        ) : (
          data.blocks
            .slice()
            .reverse()
            .map((b) => (
              <div key={b.index} className="bg-white border border-slate-200 rounded-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#0033A0] text-white flex items-center justify-center rounded-sm">
                      <Link2 size={16} />
                    </div>
                    <div>
                      <div className="font-display font-black text-lg">Block #{b.index}</div>
                      <div className="micro-label">{b.action}</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-500">{b.timestamp?.slice(0, 19).replace("T", " ")}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="micro-label">Case</div>
                    <div className="font-mono text-sm text-[#0033A0]">{b.case_id}</div>
                  </div>
                  <div>
                    <div className="micro-label">By</div>
                    <div className="font-mono text-sm">{b.user_email}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="micro-label">Previous Hash</div>
                    <div className="font-mono text-[11px] break-all text-slate-600">{b.previous_hash}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="micro-label">Current Hash</div>
                    <div className="font-mono text-[11px] break-all text-[#0033A0]">{b.current_hash}</div>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
