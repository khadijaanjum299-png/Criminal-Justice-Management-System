import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Smartphone } from "lucide-react";

export default function SmsPreferenceForm({ onSaved }) {
  const [phone, setPhone] = useState("");
  const [smsOn, setSmsOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/auth/me")
      .then(({ data }) => {
        if (cancelled || !data) return;
        setPhone(data.phone || "");
        setSmsOn(data.notify_sms_enabled !== false);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/user/notification-settings", {
        phone: phone.trim(),
        notify_sms_enabled: smsOn,
      });
      toast.success("Notification preferences saved");
      onSaved?.();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Loading preferences…</div>;
  }

  return (
    <form onSubmit={save} className="rounded-xl border border-cyan-500/20 bg-slate-950/60 p-6 shadow-[0_0_24px_rgba(34,211,238,0.06)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/25">
          <Smartphone className="h-5 w-5 text-cyan-400" aria-hidden />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-white tracking-tight">SMS alerts</h2>
          <p className="text-xs text-slate-500 mt-0.5">Court verdicts, hearings, appeals, and case closure</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 py-4 border-y border-white/[0.06]">
        <div>
          <div className="text-sm font-medium text-slate-200">Enable SMS</div>
          <div className="text-xs text-slate-500 mt-0.5">When off, SMS is skipped (email may still send if SMTP is configured).</div>
        </div>
        <Switch
          checked={smsOn}
          onCheckedChange={setSmsOn}
          className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-slate-700 border border-cyan-500/30"
        />
      </div>

      <div className="mt-4">
        <label className="micro-label text-slate-400">Mobile number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+92XXXXXXXXXX or full E.164"
          className="mt-1.5 w-full rounded-lg border border-slate-700/90 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 shadow-inner focus:border-cyan-500/45 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
        />
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          Use international format (leading +) when possible. If your number has no country code, the server can prepend{" "}
          <span className="font-mono text-cyan-500/80">SMS_DEFAULT_DIAL_PREFIX</span> from environment.
        </p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-5 w-full sm:w-auto rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-5 py-2.5 text-sm font-semibold text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)] hover:bg-cyan-950/60 hover:border-cyan-400/50 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
