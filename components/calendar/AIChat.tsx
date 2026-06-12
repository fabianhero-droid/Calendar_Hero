"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Calendar, X, Minimize2, Maximize2 } from "lucide-react";
import { parseNaturalLanguage } from "@/lib/nlParser";
import { ParsedEventDraft, CalendarEvent } from "@/lib/types";
import { EVENT_COLORS, getColorById } from "@/lib/eventColors";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  event?: CalendarEvent;
  error?: boolean;
}

interface Props {
  onEventAdded: (event: Omit<CalendarEvent, "id">) => void;
}

const SUGGESTIONS = [
  "Morgen um 10 Uhr Zahnarzt für 1 Stunde",
  "Nächsten Montag 14 Uhr Meeting mit Sarah",
  "Heute 18:30 Uhr Sport für 45 Minuten",
  "Freitag 9 Uhr Standup für 30 Minuten",
];

const COLOR_KEYWORDS: Record<string, string> = {
  arbeit: "blue", meeting: "blue", standup: "blue", call: "blue", zoom: "blue",
  sport: "emerald", gym: "emerald", laufen: "emerald", training: "emerald", yoga: "emerald",
  arzt: "rose", zahnarzt: "rose", krank: "rose", termin: "violet",
  geburtstag: "amber", party: "amber", feier: "amber",
  urlaub: "sky", reise: "sky", flug: "sky",
};

function guessColor(title: string): string {
  const lower = title.toLowerCase();
  for (const [keyword, color] of Object.entries(COLOR_KEYWORDS)) {
    if (lower.includes(keyword)) return color;
  }
  // Cycle through colors based on title hash
  const idx = Math.abs(title.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % EVENT_COLORS.length;
  return EVENT_COLORS[idx].id;
}

function formatEventResponse(event: CalendarEvent): string {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const dateStr = format(start, "EEEE, d. MMMM", { locale: de });
  const timeStr = event.allDay
    ? "Ganztägig"
    : `${format(start, "HH:mm")} – ${format(end, "HH:mm")} Uhr`;
  return `Erledigt! Ich habe „${event.title}" eingetragen:\n📅 ${dateStr}\n⏰ ${timeStr}`;
}

export default function AIChat({ onEventAdded }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      text: "Hallo! Ich bin dein KI-Kalender-Assistent. Sag mir einfach welchen Termin ich eintragen soll – in normaler Sprache.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    await new Promise((r) => setTimeout(r, 400));

    const draft = parseNaturalLanguage(msg);
    if (!draft) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          text: 'Das habe ich leider nicht verstanden. Versuche es so: "Morgen um 14 Uhr Meeting für 1 Stunde"',
          error: true,
        },
      ]);
      setLoading(false);
      return;
    }

    const color = guessColor(draft.title);
    const newEvent: Omit<CalendarEvent, "id"> = {
      title: draft.title,
      start: draft.start.toISOString(),
      end: draft.end.toISOString(),
      color,
      allDay: false,
      description: draft.description,
    };

    onEventAdded(newEvent);

    const fakeEvent: CalendarEvent = { ...newEvent, id: "preview" };
    setMessages((prev) => [
      ...prev,
      {
        id: `ai-${Date.now()}`,
        role: "ai",
        text: formatEventResponse(fakeEvent),
        event: fakeEvent,
      },
    ]);
    setLoading(false);
  }

  return (
    <div className={`flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${minimized ? "h-12" : "h-72"}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-500 cursor-pointer flex-shrink-0"
        onClick={() => setMinimized((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-white">KI-Assistent</span>
          {!minimized && (
            <span className="text-xs text-white/60 hidden sm:block">Termin in natürlicher Sprache eingeben</span>
          )}
        </div>
        <button className="text-white/70 hover:text-white transition-colors">
          {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "ai" && (
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                    <Sparkles size={10} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === "user" ? "order-1" : ""}`}>
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-line ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white rounded-br-sm"
                        : msg.error
                        ? "bg-rose-50 text-rose-700 rounded-bl-sm"
                        : "bg-gray-100 text-gray-700 rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {/* Event card */}
                  {msg.event && (
                    <div className={`mt-1.5 rounded-xl px-3 py-2 border ${getColorById(msg.event.color).light} ${getColorById(msg.event.color).border} ${getColorById(msg.event.color).text}`}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${getColorById(msg.event.color).bg}`} />
                        <span className="text-xs font-semibold">{msg.event.title}</span>
                      </div>
                      <div className="text-xs opacity-70 mt-0.5">
                        {format(new Date(msg.event.start), "EEE, d. MMM · HH:mm", { locale: de })} Uhr
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  <Sparkles size={10} className="text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5 hover:bg-blue-100 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 flex-shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:bg-white transition-all"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Termin eingeben…"
                disabled={loading}
                className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-7 h-7 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send size={13} className="text-white" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
