"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { parseNaturalLanguage } from "@/lib/nlParser";
import { CalendarEvent, ParsedEventDraft } from "@/lib/types";

interface Props {
  onEventParsed: (draft: ParsedEventDraft) => void;
}

const EXAMPLES = [
  "Nächsten Dienstag um 14 Uhr Meeting mit Sarah für 1 Stunde",
  "Heute um 18 Uhr Arzttermin",
  "Freitag 10:30 Uhr Standup für 30 Minuten",
];

export default function AIInput({ onEventParsed }: Props) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError("");

    await new Promise((r) => setTimeout(r, 350)); // simulate AI delay

    const draft = parseNaturalLanguage(value);
    if (draft) {
      onEventParsed(draft);
      setValue("");
    } else {
      setError("Konnte den Termin nicht erkennen. Bitte versuche es erneut.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-violet-50 rounded-2xl p-4 border border-blue-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg flex items-center justify-center">
          <Sparkles size={14} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-700">KI-Assistent</span>
        <span className="text-xs text-gray-400 ml-auto">Natürliche Sprache</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={EXAMPLES[Math.floor(Date.now() / 5000) % EXAMPLES.length]}
          className="flex-1 text-sm bg-white border border-blue-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 transition-colors placeholder-gray-300 text-gray-700"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5 text-sm font-medium"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        </button>
      </form>

      {error && <p className="text-xs text-rose-500 mt-2">{error}</p>}

      <div className="flex gap-2 mt-3 flex-wrap">
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setValue(ex)}
            className="text-xs text-blue-600 bg-white border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition-colors truncate max-w-[200px]"
          >
            {ex.slice(0, 35)}…
          </button>
        ))}
      </div>
    </div>
  );
}
