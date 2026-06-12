import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CalendarEvent } from "@/lib/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Du bist ein intelligenter Kalender-Assistent. Du hilfst dem Nutzer Termine zu verwalten.

Heute ist: ${new Date().toLocaleDateString("de-AT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

Du antwortest IMMER mit einem JSON-Objekt in folgendem Format:
{
  "message": "Deine freundliche Antwort auf Deutsch",
  "actions": [
    {
      "type": "create" | "delete" | "none",
      "event": {
        "title": "Titel",
        "start": "ISO 8601 datetime string (lokale Österreich-Zeit, z.B. 2026-06-15T10:00:00+02:00)",
        "end": "ISO 8601 datetime string",
        "color": "blue|violet|emerald|rose|amber|sky",
        "description": "optional",
        "allDay": false
      }
    }
  ]
}

Regeln:
- Bei "create": Fülle alle Felder aus. Nutze Österreich-Zeitzone (CEST = UTC+2 im Sommer, CET = UTC+1 im Winter).
- Bei "delete": Gib nur "title" und "start" an (zur Identifikation).
- Wenn keine Aktion nötig ist: leeres "actions" Array.
- Farben: Arbeit/Meeting=blue, Sport=emerald, Arzt=rose, Geburtstag/Party=amber, Urlaub/Reise=sky, Sonstiges=violet
- Bei WM/EM/Sport-Events: Nutze öffentlich bekannte Spielpläne. Wenn du unsicher bist, sage es.
- Antworte IMMER nur mit validem JSON, kein Text davor oder danach.`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY nicht konfiguriert." }, { status: 503 });
  }

  try {
    const { message, events } = await req.json();

    const eventsContext = events?.length
      ? `\nAktuelle Termine im Kalender (${events.length} Stück):\n${
          events.slice(0, 30).map((e: CalendarEvent) =>
            `- "${e.title}" am ${new Date(e.start).toLocaleDateString("de-AT")} um ${new Date(e.start).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}`
          ).join("\n")
        }`
      : "\nKalender ist leer.";

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: SYSTEM_PROMPT + eventsContext,
      messages: [{ role: "user", content: message }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Kein JSON in Antwort");

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("AI chat error:", err);
    return NextResponse.json({
      message: "Entschuldigung, ich hatte einen Fehler. Bitte versuche es nochmal.",
      actions: [],
    });
  }
}
