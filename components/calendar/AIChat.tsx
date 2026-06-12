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
  event?: CalendarEvent;
  deletedEvents?: CalendarEvent[];
  error?: boolean;
}

interface Props {
  onEventAdded: (event: Omit<CalendarEvent, "id">) => void;
  onEventDeleted: (id: string) => void;
  events: CalendarEvent[];
}

const SUGGESTIONS = [
  "Morgen um 10 Uhr Zahnarzt für 1 Stunde",
  "Nächsten Montag 14 Uhr Meeting mit Sarah",
  "Lösche den Zahnarzt morgen",
  "Freitag 9 Uhr Standup löschen",
];

const COLOR_KEYWORDS: Record<string, string> = {
  arbeit: "blue", meeting: "blue", standup: "blue", call: "blue", zoom: "blue",
  sport: "emerald", gym: "emerald", laufen: "emerald", training: "emerald", yoga: "emerald",
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

// Detect delete intent
const DELETE_PATTERNS = [
  /lösch[e]?\s+(.+)/i,
  /entfern[e]?\s+(.+)/i,
  /streich[e]?\s+(.+)/i,
  /delete\s+(.+)/i,
  /(.+)\s+löschen/i,
  /(.+)\s+entfernen/i,
  /(.+)\s+streichen/i,
];

function detectDeleteIntent(msg: string): string | null {
  for (const pattern of DELETE_PATTERNS) {
    const m = msg.match(pattern);
    if (m) return m[1].trim();
  }
  return null;
}

function findMatchingEvents(query: string, events: CalendarEvent[]): CalendarEvent[] {
  const lower = query.toLowerCase().trim();
  const words = lower.split(/\s+/).filter((w) => w.length > 2);

  // Try to parse a date from the query
  const draft = parseNaturalLanguage(query);
  const targetDate = draft?.start ?? null;

  return events.filter((e) => {
    // Skip WebUntis school lessons unless explicitly named
    if (e.id.startsWith("untis_")) {
      return lower.includes(e.title.toLowerCase());
    }

    const titleLower = e.title.toLowerCase();

    // Direct title match
    if (titleLower.includes(lower)) return true;

    // Any word matches title
    const wordMatch = words.some((w) => titleLower.includes(w));

    // Date match: same day as parsed date AND any word in title
    const dateMatch = targetDate
      ? isSameDay(parseISO(e.start), targetDate) && wordMatch
      : false;

    return wordMatch || dateMatch;
  });
}

function formatEventResponse(event: CalendarEvent): string {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const dateStr = format(start, "EEEE, d. MMMM", { locale: de });
  const timeStr = event.allDay ? "Ganztägig" : `${format(start, "HH:mm")} – ${format(end, "HH:mm")} Uhr`;
  return `Erledigt! Ich habe „${event.title}" eingetragen:\n📅 ${dateStr}\n⏰ ${timeStr}`;
}

export default function AIChat({ onEventAdded, onEventDeleted, events }: Props) {
  const eventsRef = useRef<CalendarEvent[]>(events);
  useEffect(() => { eventsRef.current = events; }, [events]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      text: "Hallo! Ich bin dein KI-Assistent. Ich kann Termine eintragen oder löschen – einfach in normaler Sprache.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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

    await new Promise((r) => setTimeout(r, 350));

    // --- DELETE ALL intent ---
    if (/lösch[e]?\s+alles|alles\s+löschen|alle\s+termine\s+löschen|lösch[e]?\s+alle\s+termine/i.test(msg)) {
      const all = eventsRef.current;
      if (all.length === 0) {
        setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "ai", text: "Es gibt keine Termine zum Löschen." }]);
        setLoading(false);
        return;
      }
      all.forEach((e) => onEventDeleted(e.id));
      setMessages((prev) => [...prev, {
        id: `ai-${Date.now()}`, role: "ai",
        text: `🗑️ Alle ${all.length} Termine wurden gelöscht.`,
        deletedEvents: all,
      }]);
      setLoading(false);
      return;
    }

    // --- DELETE STUNDENPLAN intent ---
    if (/lösch[e]?\s+stundenplan|stundenplan\s+löschen|webuntis\s+löschen|lösch[e]?\s+webuntis|unterricht\s+löschen|lösch[e]?\s+unterricht/i.test(msg)) {
      const untisEvents = eventsRef.current.filter((e) => e.id.startsWith("untis_"));
      if (untisEvents.length === 0) {
        setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "ai", text: "Es sind keine Stundenplan-Einträge vorhanden." }]);
        setLoading(false);
        return;
      }
      untisEvents.forEach((e) => onEventDeleted(e.id));
      setMessages((prev) => [...prev, {
        id: `ai-${Date.now()}`, role: "ai",
        text: `🗑️ Stundenplan gelöscht – ${untisEvents.length} Schulstunden entfernt.`,
        deletedEvents: untisEvents,
      }]);
      setLoading(false);
      return;
    }

    // --- DELETE single event intent ---
    const deleteQuery = detectDeleteIntent(msg);
    if (deleteQuery) {
      const matches = findMatchingEvents(deleteQuery, eventsRef.current);

      if (matches.length === 0) {
        setMessages((prev) => [...prev, {
          id: `ai-${Date.now()}`, role: "ai", error: true,
          text: `Ich habe keinen Termin gefunden der zu „${deleteQuery}" passt.`,
        }]);
        setLoading(false);
        return;
      }

      matches.forEach((e) => onEventDeleted(e.id));
      const names = matches.map((e) => `„${e.title}" (${format(parseISO(e.start), "d. MMM HH:mm", { locale: de })})`).join(", ");
      setMessages((prev) => [...prev, {
        id: `ai-${Date.now()}`, role: "ai",
        text: `🗑️ Gelöscht: ${names}`,
        deletedEvents: matches,
      }]);
      setLoading(false);
      return;
    }

    // --- CREATE intent ---
    const draft = parseNaturalLanguage(msg);
    if (!draft) {
      setMessages((prev) => [...prev, {
        id: `ai-${Date.now()}`, role: "ai", error: true,
        text: 'Das habe ich nicht verstanden. Beispiele:\n• "Morgen 14 Uhr Meeting"\n• "Zahnarzt löschen"\n• "Lösche den Sport am Freitag"',
      }]);
      setLoading(false);
      return;
    }

    const newEvent: Omit<CalendarEvent, "id"> = {
      title: draft.title,
      start: draft.start.toISOString(),
      end: draft.end.toISOString(),
      color: guessColor(draft.title),
      allDay: false,
      description: draft.description,
    };
    onEventAdded(newEvent);

    setMessages((prev) => [...prev, {
      id: `ai-${Date.now()}`, role: "ai",
      text: formatEventResponse({ ...newEvent, id: "preview" }),
      event: { ...newEvent, id: "preview" },
    }]);
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
          {!minimized && <span className="text-xs text-white/60 hidden sm:block">Termine eintragen oder löschen</span>}
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
                <div className="max-w-[80%]">
                  <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white rounded-br-sm"
                      : msg.error
                      ? "bg-rose-50 text-rose-700 rounded-bl-sm"
                      : "bg-gray-100 text-gray-700 rounded-bl-sm"
                  }`}>
                    {msg.text}
                  </div>

                  {/* Added event card */}
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

                  {/* Deleted events */}
                  {msg.deletedEvents && msg.deletedEvents.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {msg.deletedEvents.map((e) => (
                        <div key={e.id} className="rounded-xl px-3 py-2 border border-rose-200 bg-rose-50 text-rose-600 flex items-center gap-2">
                          <Trash2 size={12} />
                          <div>
                            <div className="text-xs font-semibold line-through opacity-70">{e.title}</div>
                            <div className="text-[10px] opacity-60">
                              {format(parseISO(e.start), "EEE, d. MMM · HH:mm", { locale: de })} Uhr
                            </div>
                          </div>
                        </div>
                      ))}
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
            <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => handleSend(s)}
                  className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5 hover:bg-blue-100 transition-colors whitespace-nowrap flex-shrink-0">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 flex-shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:bg-white transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Termin eintragen oder löschen…"
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
