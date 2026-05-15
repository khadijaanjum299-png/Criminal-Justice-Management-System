import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Link2, ShieldCheck, ShieldAlert } from "lucide-react";

export default function Blockchain() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/blockchain").then(({ data }) => setData(data)).catch(() => {});
  }, []);

  if (!data) return <div className="micro-label">Loading…</div>;

  const isCitizen = user?.role === "citizen";
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Chain Length</div>
          <div className="font-display font-black text-4xl mt-2" data-testid="chain-length">
            {data.count}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Valid Blocks</div>
          <div className="font-display font-black text-4xl mt-2" data-testid="valid-blocks">
            {data.valid_blocks}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Broken Blocks</div>
          <div className="font-display font-black text-4xl mt-2" data-testid="broken-blocks">
            {data.broken_blocks}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Legacy Blocks</div>
          <div className="font-display font-black text-4xl mt-2" data-testid="legacy-blocks">
            {data.legacy_blocks}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          data-testid="chain-integrity"
          className={`border rounded-sm p-5 ${data.integrity_ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
        >
          <div className="micro-label">Integrity Status</div>
          <div className={`font-display font-black text-2xl mt-2 flex items-center gap-2 ${data.integrity_ok ? "text-[#12B76A]" : "text-[#D92D20]"}`}>
            {data.integrity_ok ? <><ShieldCheck size={22} /> Integrity Verified</> : <><ShieldAlert size={22} /> Integrity Broken</>}
          </div>
          {data.integrity_status === "legacy_data" && (
            <div className="text-xs text-amber-700 mt-2">
              Legacy data detected: {data.legacy_blocks} block(s) use an older hash format.
            </div>
          )}
          {data.broken_at !== null && (
            <div className="text-xs text-red-700 mt-2">First broken block at index #{data.broken_at}</div>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <div className="micro-label">Last Block Timestamp</div>
          <div className="font-display font-black text-2xl mt-2 font-mono">
            {data.blocks.length ? data.blocks[data.blocks.length - 1].timestamp.slice(0, 19).replace("T", " ") : "N/A"}
          </div>
          <div className="text-sm text-slate-500 mt-3">
            Blocks are ordered by index from genesis to most recent.
          </div>
        </div>
      </div>

      {isCitizen ? (
        <div className="bg-white border border-slate-200 rounded-sm p-6">
          <div className="font-display font-bold mb-3">Blockchain Summary</div>
          <div className="text-sm text-slate-600 mb-4">
            Citizens may view ledger integrity and evidence verification status, but detailed internal block metadata is restricted.
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold">Chain Integrity</div>
              <div className="mt-1">{data.integrity_ok ? "Verified" : "Broken"}</div>
            </div>
            <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold">Status</div>
              <div className="mt-1">{data.integrity_status === "legacy_data" ? "Legacy validation supported" : data.integrity_status}</div>
            </div>
            <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold">Public Audit</div>
              <div className="mt-1">{data.public_verification?.message || "Use the public blockchain hash and CID values to verify evidence authenticity externally."}</div>
              {data.public_verification?.details && (
                <div className="text-xs text-slate-500 mt-2">{data.public_verification.details}</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4" data-testid="blocks-list">
          {blocks.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-sm p-10 text-center text-slate-500 text-sm">
              Chain empty — first FIR or evidence upload will create the genesis block.
            </div>
          ) : (
            blocks
              .slice()
              .reverse()
              .map((b) => (
                <div key={b.index} className="bg-white border border-slate-200 rounded-sm p-5">
                <div className="flex items-center justify-between mb-3 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary text-primary-foreground flex items-center justify-center rounded-sm">
                      <Link2 size={16} />
                    </div>
                    <div>
                      <div className="font-display font-black text-lg">Block #{b.index}</div>
                      <div className="micro-label">{b.action}</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-500">{b.timestamp?.slice(0, 19).replace("T", " ")}</div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                  <span className={`inline-flex items-center rounded-full px-2 py-1 ${b.valid ? "bg-green-50 text-[#166534] border border-green-200" : "bg-red-50 text-[#991b1b] border border-red-200"}`}>
                    {b.valid ? "VALID" : "INVALID"}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 ${b.hash_ok ? "bg-green-50 text-[#166534] border border-green-200" : "bg-red-50 text-[#991b1b] border border-red-200"}`}>
                    Hash {b.hash_ok ? "OK" : "FAIL"}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 ${b.link_ok ? "bg-green-50 text-[#166534] border border-green-200" : "bg-red-50 text-[#991b1b] border border-red-200"}`}>
                    Link {b.link_ok ? "OK" : "FAIL"}
                  </span>
                  {b.legacy && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 text-[#92400e] border border-amber-200 px-2 py-1">
                      Legacy Hash
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="micro-label">Case</div>
                    <div className="font-mono text-sm text-primary">{b.case_id}</div>
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
                    <div className="font-mono text-[11px] break-all text-primary">{b.current_hash}</div>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
      )}
    </div>
  );
}
