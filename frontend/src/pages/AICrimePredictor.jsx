import { useState, useRef } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Search, AlertTriangle, ShieldCheck, MessageSquare, Send } from "lucide-react";

const RISK_BADGES = {
  Low: "bg-green-50 text-[#166534] border border-green-200",
  Medium: "bg-amber-50 text-[#92400e] border border-amber-200",
  High: "bg-red-50 text-[#991b1b] border border-red-200",
};

const PAKISTAN_CITIES = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Peshawar",
  "Quetta",
  "Multan",
  "Faisalabad",
  "Hyderabad",
  "Gujranwala",
];

const CITY_AREAS = {
  Karachi: ["Clifton", "DHA", "Korangi", "Gulshan-e-Iqbal", "Nazimabad"],
  Lahore: ["Gulberg", "Johar Town", "Cantt", "Model Town", "Shadman"],
  Islamabad: ["F-8", "Blue Area", "G-11", "E-11", "Bahria Town"],
  Rawalpindi: ["Satellite Town", "Gawalmandi", "Saddar", "Chaklala", "Bahria Town"],
  Peshawar: ["Hayatabad", "University Town", "F-7", "Gulbahar", "Khyber Bazaar"],
  Quetta: ["Jinnah Town", "Satellite Town", "Mezan", "Sariab Road", "Gulistan"],
  Multan: ["Gulgasht", "Shah Rukn-e-Alam", "Boson Town", "Dharabi", "Gulshan-e-Madina"],
  Faisalabad: ["Millat Town", "Madina Town", "People's Colony", "Jaranwala Road", "Iqbal Town"],
  Hyderabad: ["Latifabad", "Qasimabad", "Tando Jam", "Saeedabad", "Hussainabad"],
  Gujranwala: ["Model Town", "Satellite Town", "Sialkot Road", "Gujranwala Cantt", "Alipur Chatha"],
};

export default function AICrimePredictor() {
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [question, setQuestion] = useState("");
  const [riskResult, setRiskResult] = useState(null);
  const [highRiskAreas, setHighRiskAreas] = useState([]);
  const [chatResult, setChatResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const chatInputRef = useRef(null);

  const handleScrollToChat = () => {
    chatInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    chatInputRef.current?.focus();
  };

  const handleCheckRisk = async () => {
    if (!city.trim() || !area.trim()) {
      toast.error("Please enter both city and area.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/ai/predict-risk", { city: city.trim(), area: area.trim() });
      setRiskResult(data);
      setChatResult(null);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHighRiskAreas = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/ai/high-risk-areas", { params: { city: city.trim() || undefined } });
      setHighRiskAreas(data.areas || []);
      setChatResult(null);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAskAI = async () => {
    if (!question.trim()) {
      toast.error("Ask a question before submitting.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/ai/ask", { question: question.trim(), city: city.trim(), area: area.trim() });
      setChatResult(data);
      setRiskResult(null);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      <header className="border-b border-cyan-500/20 pb-6">
        <div className="micro-label mb-2 text-cyan-300/80">AI Crime Predictor</div>
        <h1 className="font-display text-4xl font-black tracking-tight leading-none text-slate-100">Predict Crime Risk</h1>
        <p className="text-sm text-slate-300 mt-2 max-w-2xl">
          Use a lightweight rule-based predictor to flag risky neighborhoods, review likely crime types, and ask the AI assistant for quick insights.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="neon-box neon-pulse rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="micro-label text-slate-300">City</label>
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setArea("");
                }}
                className="w-full border border-slate-700 bg-slate-900/60 px-3 py-2 rounded-sm focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 focus:outline-none text-sm text-white"
              >
                <option value="" disabled>
                  Select city
                </option>
                {PAKISTAN_CITIES.map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="micro-label text-slate-300">Area</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                disabled={!city}
                className="w-full border border-slate-700 bg-slate-900/60 px-3 py-2 rounded-sm focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 focus:outline-none text-sm text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="" disabled>
                  {city ? "Select area" : "Select a city first"}
                </option>
                {(CITY_AREAS[city] || []).map((areaName) => (
                  <option key={areaName} value={areaName}>
                    {areaName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleCheckRisk}
              disabled={loading}
              className="bg-[#0033A0] text-white px-4 py-3 text-sm font-semibold rounded-sm hover:bg-[#002370] disabled:opacity-60"
            >
              <Search size={16} /> Check Risk
            </button>
            <button
              type="button"
              onClick={handleHighRiskAreas}
              disabled={loading}
              className="bg-[#12B76A] text-white px-4 py-3 text-sm font-semibold rounded-sm hover:bg-[#0f7a46] disabled:opacity-60"
            >
              <AlertTriangle size={16} /> High Risk Areas
            </button>
            <button
              type="button"
              onClick={handleScrollToChat}
              disabled={loading}
              className="bg-[#8b5cf6] text-white px-4 py-3 text-sm font-semibold rounded-sm hover:bg-[#7c3aed] disabled:opacity-60"
            >
              <MessageSquare size={16} /> Ask AI
            </button>
          </div>

          <div className="neon-box rounded-2xl p-5">
            <div className="micro-label mb-3 text-cyan-300/80">Risk Output</div>
            {riskResult ? (
              <div className="space-y-4 text-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full px-3 py-1 text-sm font-semibold ${RISK_BADGES[riskResult.risk_level] || RISK_BADGES.Low}`}>
                    {riskResult.risk_level}
                  </div>
                  <div className="text-slate-300">City: {riskResult.city} · Area: {riskResult.area}</div>
                </div>
                <div className="space-y-2">
                  <div className="font-semibold">Predicted Crimes</div>
                  <div className="text-sm text-slate-300">{riskResult.predicted_crimes.join(", ")}</div>
                </div>
                <div className="text-xs text-slate-400">{riskResult.reason}</div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Run a risk check to see likely threat level and crime predictions.</div>
            )}
          </div>

          <div className="neon-box rounded-2xl p-5">
            <div className="micro-label mb-3 text-cyan-300/80">Chatbot Assistant</div>
            <div className="space-y-3">
              <textarea
                ref={chatInputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAskAI();
                  }
                }}
                placeholder="Ask questions like 'Which area is risky?' or 'Future crime prediction?'"
                rows={4}
                className="w-full border border-slate-700 bg-slate-900/60 px-3 py-2 rounded-sm focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 focus:outline-none text-sm text-white"
              />
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-slate-400">
                  Press Enter to send, Shift+Enter for a new line.
                </div>
                <button
                  type="button"
                  onClick={handleAskAI}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#8b5cf6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7c3aed] disabled:opacity-60"
                >
                  <Send size={16} /> Ask
                </button>
              </div>
              <div className="text-xs text-slate-400">The AI assistant uses simple rule-based analysis for fast, explainable responses.</div>
            </div>
          </div>

          {chatResult && (
            <div className="neon-box rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="micro-label text-cyan-300/80">AI Response</div>
                  <h2 className="font-display text-xl font-black tracking-tight text-slate-100">{chatResult.title || "Assistant"}</h2>
                </div>
              </div>
              <div className="space-y-3 text-sm text-slate-200">
                <p>{chatResult.answer}</p>
                {chatResult.notes && <p className="text-xs text-slate-400">{chatResult.notes}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="neon-box rounded-2xl p-6">
            <div className="micro-label mb-3 text-cyan-300/80">High Risk Areas</div>
            {highRiskAreas.length > 0 ? (
              <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
                {highRiskAreas.map((areaName) => (
                  <li key={areaName}>{areaName}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-400">No high-risk area list requested yet. Click "High Risk Areas" to fetch suggestions.</div>
            )}
          </div>

          <div className="neon-box rounded-2xl p-6">
            <div className="micro-label mb-3 text-cyan-300/80">How it works</div>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-300">
              <li>Risk is assessed using a rule-based model built from area keywords and city patterns.</li>
              <li>No heavy machine learning models are used — just explainable heuristics.</li>
              <li>High-risk area suggestions are generated from a small static dataset and the current city.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
