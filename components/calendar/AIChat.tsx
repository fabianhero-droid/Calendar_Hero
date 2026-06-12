"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Minimize2, Maximize2, Trash2 } from "lucide-react";
import { parseNaturalLanguage } from "@/lib/nlParser";
import { CalendarEvent } from "@/lib/types";
import { getColorById } from "@/lib/eventColors";
import { format, parseISO, isSameDay } from "date-fns";
import { de } from "date-fns/locale";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  createdEvents?: CalendarEvent[];
  deletedEvents?: CalendarEvent[];
  error?: boolean;
}

interface Props {
  onEventAdded: (event: Omit<CalendarEvent, "id">) => void;
  onEventDeleted: (id: string) => void;
  events: CalendarEvent[];
}

const SUGGESTIONS = [
  "Füge alle WM 2026 Spiele Österreichs ein",
  "Morgen 14 Uhr Meeting mit Sarah",
  "Lösche alle Termine",
  "Was habe ich nächste Woche?",
];

const COLOR_KEYWORDS: Record<string, string> = {
  arbeit: "blue", meeting: "blue", standup: "blue", call: "blue", zoom: "blue",
  sport: "emerald", gym: "emerald", laufen: "emerald", training: "emerald", yoga: "emerald",
  fußball: "emerald", tennis: "emerald", wm: "emerald", em: "emerald",
  arzt: "rose", zahnarzt: "rose", krank: "rose",
  geburtstag: "amber", party: "amber", feier: "amber",
  urlaub: "sky", reise: "sky", flug: "sky",
  termin: "violet",
};

function guessColor(title: string): string {
  const lower = title.toLowerCase();
  for (const [keyword, color] of Object.entries(COLOR_KEYWORDS)) {
    if (lower.includes(keyword)) return color;
  }
  const idx = Math.abs(title.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 6;
  return ["blue", "violet", "emerald", "rose", "amber", "sky"][idx];
}

const DELETE_PATTERNS = [
  /lösch[e]?\s+(.+)/i, /entfern[e]?\s+(.+)/i, /streich[e]?\s+(.+)/i,
  /(.+)\s+löschen/i, /(.+)\s+entfernen/i,
];

function detectDeleteIntent(msg: string): string | null {
  for (const p of DELETE_PATTERNS) {
    const m = msg.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function findMatchingEvents(query: string, events: CalendarEvent[]): CalendarEvent[] {
  const lower = query.toLowerCase().trim();
  const words = lower.split(/\s+/).filter((w) => w.length > 2);
  const draft = parseNaturalLanguage(query);
  const targetDate = draft?.start ?? null;

  return events.filter((e) => {
    if (e.id.startsWith("untis_") && !lower.includes(e.title.toLowerCase())) return false;
    const titleLower = e.title.toLowerCase();
    if (titleLower.includes(lower)) return true;
    const wordMatch = words.some((w) => titleLower.includes(w));
    const dateMatch = targetDate ? isSameDay(parseISO(e.start), targetDate) && wordMatch : false;
    return wordMatch || dateMatch;
  });
}

function generateId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function AIChat({ onEventAdded, onEventDeleted, events }: Props) {
  const eventsRef = useRef<CalendarEvent[]>(events);
  useEffect(() => { eventsRef.current = events; }, [events]);

  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome", role: "ai",
    text: "Hallo! Ich bin dein KI-Assistent – powered by Claude.\n\nIch kann Termine eintragen, löschen und komplexe Anfragen verstehen wie \"Füge alle WM-Spiele ein\" oder \"Was habe ich diese Woche?\"",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Check if AI is available
  useEffect(() => {
    fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "ping", events: [] }),
    }).then((r) => setAiAvailable(r.ok)).catch(() => setAiAvailable(false));
  }, []);

  async function handleSendWithAI(msg: string) {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, events: eventsRef.current.slice(0, 50) }),
      });

      if (!res.ok) throw new Error("AI nicht verfügbar");
      const data = await res.json();

      const createdEvents: CalendarEvent[] = [];
      const deletedEvents: CalendarEvent[] = [];

      for (const action of (data.actions ?? [])) {
        if (action.type === "create" && action.event) {
          const newEvt: CalendarEvent = {
            ...action.event,
            id: generateId(),
            color: action.event.color ?? guessColor(action.event.title ?? ""),
          };
          onEventAdded(newEvt);
          createdEvents.push(newEvt);
        } else if (action.type === "delete" && action.event) {
          const matches = findMatchingEvents(action.event.title ?? "", eventsRef.current);
          matches.forEach((e) => { onEventDeleted(e.id); deletedEvents.push(e); });
        }
      }

      setMessages((prev) => [...prev, {
        id: `ai-${Date.now()}`, role: "ai",
        text: data.message ?? "Erledigt!",
        createdEvents: createdEvents.length ? createdEvents : undefined,
        deletedEvents: deletedEvents.length ? deletedEvents : undefined,
      }]);
    } catch {
      // Fallback to local parser
      await handleSendLocal(msg);
    }
  }

  async function handleSendLocal(msg: string) {
    // DELETE ALL
    if (/lösch[e]?\s+alles|alles\s+löschen|alle\s+termine|entfern[e]?\s+alle/i.test(msg)) {
      const all = eventsRef.current;
      all.forEach((e) => onEventDeleted(e.id));
      setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "ai", text: `🗑️ Alle ${all.length} Termine gelöscht.`, deletedEvents: all }]);
      return;
    }
    // DELETE STUNDENPLAN
    if (/stundenplan|webuntis|schulstunden?|unterricht/i.test(msg) && /lösch|entfern|weg/i.test(msg)) {
      const untis = eventsRef.current.filter((e) => e.id.startsWith("untis_"));
      untis.forEach((e) => onEventDeleted(e.id));
      setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "ai", text: `🗑️ Stundenplan gelöscht (${untis.length} Stunden).`, deletedEvents: untis }]);
      return;
    }
    // DELETE single
    if (/^(lösch|entfern|streich|delete|remove|weg)/i.test(msg.trim())) {
      const query = detectDeleteIntent(msg);
      const matches = query ? findMatchingEvents(query, eventsRef.current) : [];
      if (!matches.length) {
        setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "ai", error: true, text: "Keinen passenden Termin gefunden." }]);
        return;
      }
      matches.forEach((e) => onEventDeleted(e.id));
      setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "ai", text: `🗑️ Gelöscht: ${matches.map((e) => `"${e.title}"`).join(", ")}`, deletedEvents: matches }]);
      return;
    }
    // CREATE
    const draft = parseNaturalLanguage(msg);
    if (!draft) {
      setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "ai", error: true, text: "Das habe ich nicht verstanden." }]);
      return;
    }
    const newEvt: CalendarEvent = { id: generateId(), title: draft.title, start: draft.start.toISOString(), end: draft.end.toISOString(), color: guessColor(draft.title), allDay: false };
    onEventAdded(newEvt);
    setMessages((prev) => [...prev, {
      id: `ai-${Date.now()}`, role: "ai",
      text: `✅ „${newEvt.title}" eingetragen:\n📅 ${format(draft.start, "EEEE, d. MMMM", { locale: de })}\n⏰ ${format(draft.start, "HH:mm")} – ${format(draft.end, "HH:mm")} Uhr`,
      createdEvents: [newEvt],
    }]);
  }

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: msg }]);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 200));

    if (aiAvailable) {
      await handleSendWithAI(msg);
    } else {
      await handleSendLocal(msg);
    }
    setLoading(false);
  }

  return (
    <div className={`flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${minimized ? "h-12" : "h-72"}`}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-500 to-violet-500 cursor-pointer flex-shrink-0"
        onClick={() => setMinimized((v) => !v)}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-white">KI-Assistent</span>
          {!minimized && aiAvailable !== null && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${aiAvailable ? "bg-white/20 text-white" : "bg-white/10 text-white/60"}`}>
              {aiAvailable ? "Claude AI" : "Basis-Modus"}
            </span>
          )}
        </div>
        <button className="text-white/70 hover:text-white">
          {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>
      </div>

      {!minimized && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "ai" && (
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                    <Sparkles size={10} className="text-white" />
                  </div>
                )}
                <div className="max-w-[82%] space-y-1.5">
                  <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-line ${
                    msg.role === "user" ? "bg-blue-500 text-white rounded-br-sm"
                    : msg.error ? "bg-rose-50 text-rose-700 rounded-bl-sm"
                    : "bg-gray-100 text-gray-700 rounded-bl-sm"
                  }`}>
                    {msg.text}
                  </div>

                  {/* Created events */}
                  {msg.createdEvents?.map((e) => (
                    <div key={e.id} className={`rounded-xl px-3 py-2 border ${getColorById(e.color).light} ${getColorById(e.color).border} ${getColorById(e.color).text}`}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getColorById(e.color).bg}`} />
                        <span className="text-xs font-semibold truncate">{e.title}</span>
                      </div>
                      <div className="text-[10px] opacity-70 mt-0.5">
                        {format(new Date(e.start), "EEE, d. MMM · HH:mm", { locale: de })} Uhr
                      </div>
                    </div>
                  ))}

                  {/* Deleted events */}
                  {msg.deletedEvents?.slice(0, 5).map((e) => (
                    <div key={e.id} className="rounded-xl px-3 py-2 border border-rose-200 bg-rose-50 text-rose-600 flex items-center gap-2">
                      <Trash2 size={11} className="flex-shrink-0" />
                      <div>
                        <div className="text-xs font-semibold line-through opacity-70">{e.title}</div>
                        <div className="text-[10px] opacity-60">{format(parseISO(e.start), "d. MMM · HH:mm", { locale: de })}</div>
                      </div>
                    </div>
                  ))}
                  {(msg.deletedEvents?.length ?? 0) > 5 && (
                    <div className="text-xs text-rose-400 pl-1">+{(msg.deletedEvents?.length ?? 0) - 5} weitere gelöscht</div>
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

          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => handleSend(s)}
                  className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5 hover:bg-blue-100 transition-colors whitespace-nowrap flex-shrink-0">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="px-3 pb-3 flex-shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:bg-white transition-all">
              <input
                type="text" value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={aiAvailable ? "Frag mich alles…" : "Termin eintragen oder löschen…"}
                disabled={loading}
                className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
              />
              <button type="submit" disabled={loading || !input.trim()}
                className="w-7 h-7 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                <Send size={13} className="text-white" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
