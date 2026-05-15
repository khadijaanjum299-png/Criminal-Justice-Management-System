import { useState } from "react";
import SmsPreferenceForm from "@/components/notifications/SmsPreferenceForm";
import NotificationLogList from "@/components/notifications/NotificationLogList";

export default function NotificationSettings() {
  const [logTick, setLogTick] = useState(0);

  return (
    <div className="space-y-8">
      <header className="border-b border-slate-800 pb-6">
        <div className="micro-label mb-2 text-cyan-500/90 tracking-widest">ALERTS</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none text-white">Notifications</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-2xl">
          SMS for verdicts, hearings, appeal outcomes, and case closure. Delivery attempts are recorded below.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <SmsPreferenceForm onSaved={() => setLogTick((t) => t + 1)} />
        <NotificationLogList reloadKey={logTick} />
      </div>
    </div>
  );
}
